import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote, unquote, urlparse

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from connectors.base import ConnectorBase

logger = logging.getLogger(__name__)


class InstagramConnector(ConnectorBase):
    """
    Connector for public Instagram profiles.

    The connector tries the lightweight web API first, then falls back to
    Playwright so dynamically loaded timeline JSON can be captured.
    """

    DEFAULT_LIMIT = 12
    APP_ID = "936619743392459"

    def fetch_list(self) -> List[Dict[str, Any]]:
        username = self._extract_username(self.base_url)
        if not username:
            logger.error("Could not extract Instagram username from %s", self.base_url)
            return []

        limit = self._get_limit()
        logger.info("Collecting Instagram posts for @%s", username)

        items = self._fetch_with_http_api(username, limit)
        if items:
            logger.info("Extracted %s Instagram posts via HTTP API", len(items))
            return items[:limit]

        logger.info("Instagram HTTP API returned no posts; falling back to Playwright")
        items = self._fetch_with_playwright(username, limit)
        logger.info("Extracted %s Instagram posts from @%s", len(items), username)
        return items[:limit]

    def _fetch_with_http_api(self, username: str, limit: int) -> List[Dict[str, Any]]:
        headers = self._headers()
        cookies = self._cookie_header()
        if cookies:
            headers["Cookie"] = cookies

        candidates = [
            f"https://www.instagram.com/api/v1/feed/user/{quote(username)}/username/?count={limit}",
            f"https://www.instagram.com/api/v1/users/web_profile_info/?username={quote(username)}",
        ]

        payloads: List[Any] = []
        for url in candidates:
            try:
                response = self.client.get(url, headers=headers, timeout=30.0)
                if response.status_code in (401, 403, 404, 429):
                    logger.warning(
                        "Instagram API %s returned %s", url, response.status_code
                    )
                    continue
                response.raise_for_status()
                payloads.append(response.json())
            except Exception as exc:
                logger.debug("Instagram API request failed for %s: %s", url, exc)

        items = self._parse_payloads(payloads)
        if items:
            return items

        try:
            profile_response = self.client.get(
                f"https://www.instagram.com/{quote(username)}/",
                headers=headers,
                timeout=30.0,
            )
            if profile_response.status_code == 200:
                return self._parse_html_payloads(profile_response.text)
        except Exception as exc:
            logger.debug("Instagram profile HTML fallback failed: %s", exc)

        return []

    def _fetch_with_playwright(self, username: str, limit: int) -> List[Dict[str, Any]]:
        profile_url = f"https://www.instagram.com/{username}/"
        payloads: List[Any] = []
        html = ""

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-infobars",
                    ],
                )

                context = browser.new_context(
                    user_agent=os.getenv("INSTAGRAM_USER_AGENT")
                    or self._headers()["User-Agent"],
                    viewport={"width": 1280, "height": 900},
                    extra_http_headers={
                        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                        "X-IG-App-ID": self.APP_ID,
                    },
                )
                context.add_init_script(
                    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
                )

                cookies = self._playwright_cookies()
                if cookies:
                    context.add_cookies(cookies)

                page = context.new_page()

                def capture_json(response):
                    response_url = response.url
                    if not self._looks_like_instagram_data_url(response_url):
                        return
                    try:
                        payloads.append(response.json())
                    except Exception:
                        return

                page.on("response", capture_json)
                page.goto(profile_url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(5000)
                for _ in range(2):
                    if len(self._parse_payloads(payloads)) >= limit:
                        break
                    page.mouse.wheel(0, 1600)
                    page.wait_for_timeout(2500)

                html = page.content()
                browser.close()
        except Exception as exc:
            logger.error("Playwright Instagram collection failed for @%s: %s", username, exc)

        items = self._parse_payloads(payloads)
        if items:
            return items

        return self._parse_html_payloads(html)

    def _parse_payloads(self, payloads: List[Any]) -> List[Dict[str, Any]]:
        found_nodes: List[Dict[str, Any]] = []
        seen = set()

        for payload in payloads:
            for node in self._find_media_nodes(payload):
                item_id = self._node_identity(node)
                if not item_id or item_id in seen:
                    continue
                seen.add(item_id)
                found_nodes.append(node)

        items = []
        for node in found_nodes:
            parsed = self._parse_node(node)
            if parsed:
                items.append(parsed)
        return items

    def _parse_html_payloads(self, html: str) -> List[Dict[str, Any]]:
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        payloads: List[Any] = []

        for script in soup.find_all("script"):
            content = script.string or script.get_text() or ""
            if not content:
                continue

            script_type = (script.get("type") or "").lower()
            if "json" in script_type:
                try:
                    payloads.append(json.loads(content))
                    continue
                except Exception:
                    pass

            if "shortcode" not in content and "media" not in content and "xdt_" not in content:
                continue

            for json_text in self._extract_json_objects(content):
                try:
                    payloads.append(json.loads(json_text))
                except Exception:
                    continue

        items = self._parse_payloads(payloads)
        if not items and ("Log in" in html or "Login" in html):
            logger.warning("Instagram profile appears to require login")
        return items

    def _find_media_nodes(self, obj: Any) -> List[Dict[str, Any]]:
        nodes: List[Dict[str, Any]] = []

        def walk(value: Any):
            if isinstance(value, dict):
                if self._looks_like_media_node(value):
                    nodes.append(value)

                if isinstance(value.get("items"), list):
                    for item in value["items"]:
                        walk(item)

                if isinstance(value.get("edges"), list):
                    for edge in value["edges"]:
                        if isinstance(edge, dict) and "node" in edge:
                            walk(edge["node"])
                        else:
                            walk(edge)

                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)

        walk(obj)
        return nodes

    def _looks_like_media_node(self, node: Dict[str, Any]) -> bool:
        if not isinstance(node, dict):
            return False

        has_identifier = bool(
            node.get("code")
            or node.get("shortcode")
            or (
                (node.get("pk") or node.get("id"))
                and (
                    "caption" in node
                    or "edge_media_to_caption" in node
                    or "taken_at" in node
                    or "taken_at_timestamp" in node
                )
            )
        )
        has_content = any(
            key in node
            for key in (
                "caption",
                "edge_media_to_caption",
                "display_url",
                "image_versions2",
                "carousel_media",
                "video_versions",
            )
        )
        return has_identifier and has_content

    def _parse_node(self, node: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            code = node.get("code") or node.get("shortcode")
            item_id = str(node.get("pk") or node.get("id") or code or "")
            if not code and not item_id:
                return None

            product_type = node.get("product_type") or node.get("__typename")
            is_reel = product_type in {"clips", "GraphVideo"} or node.get("media_type") == 2
            if code:
                path = "reel" if is_reel else "p"
                url = f"https://www.instagram.com/{path}/{code}/"
            else:
                url = self.base_url

            text = self._extract_caption(node)
            title = text.splitlines()[0].strip()[:100] if text else ""
            if not title:
                title = f"Instagram Post {code or item_id}"

            timestamp = node.get("taken_at") or node.get("taken_at_timestamp")
            published_at = (
                datetime.fromtimestamp(timestamp, tz=timezone.utc)
                if isinstance(timestamp, (int, float))
                else None
            )

            image_urls, video_urls = self._extract_media_urls(node)

            return {
                "title": title,
                "url": url,
                "source_item_id": code or item_id,
                "published_at": published_at,
                "raw_text": text,
                "image_urls": image_urls,
                "meta_json": {
                    "like_count": self._nested_count(
                        node, "edge_liked_by", "like_count"
                    ),
                    "comment_count": self._nested_count(
                        node, "edge_media_to_comment", "comment_count"
                    ),
                    "video_urls": video_urls,
                    "is_video": bool(video_urls) or is_reel,
                    "instagram_id": item_id,
                },
            }
        except Exception as exc:
            logger.warning("Error parsing Instagram media node: %s", exc)
            return None

    def _extract_caption(self, node: Dict[str, Any]) -> str:
        caption = node.get("caption")
        if isinstance(caption, dict):
            text = caption.get("text")
            if text:
                return text
        elif isinstance(caption, str):
            return caption

        edges = node.get("edge_media_to_caption", {}).get("edges", [])
        if edges:
            edge = edges[0] if isinstance(edges[0], dict) else {}
            text = edge.get("node", {}).get("text")
            if text:
                return text

        return node.get("accessibility_caption") or ""

    def _extract_media_urls(self, node: Dict[str, Any]) -> tuple[List[str], List[str]]:
        image_urls: List[str] = []
        video_urls: List[str] = []

        def add_image(url: Optional[str]):
            if url and url not in image_urls:
                image_urls.append(url)

        def add_video(url: Optional[str]):
            if url and url not in video_urls:
                video_urls.append(url)

        add_image(node.get("display_url") or node.get("thumbnail_url"))

        image_versions = node.get("image_versions2", {})
        if isinstance(image_versions, dict):
            candidates = image_versions.get("candidates", [])
            if isinstance(candidates, list) and candidates:
                add_image(candidates[0].get("url"))

        video_versions = node.get("video_versions", [])
        if isinstance(video_versions, list) and video_versions:
            add_video(video_versions[0].get("url"))

        sidecar_edges = node.get("edge_sidecar_to_media", {}).get("edges", [])
        for edge in sidecar_edges if isinstance(sidecar_edges, list) else []:
            child = edge.get("node", {}) if isinstance(edge, dict) else {}
            child_images, child_videos = self._extract_media_urls(child)
            for url in child_images:
                add_image(url)
            for url in child_videos:
                add_video(url)

        carousel = node.get("carousel_media", [])
        for child in carousel if isinstance(carousel, list) else []:
            if not isinstance(child, dict):
                continue
            child_images, child_videos = self._extract_media_urls(child)
            for url in child_images:
                add_image(url)
            for url in child_videos:
                add_video(url)

        return image_urls, video_urls

    def _headers(self) -> Dict[str, str]:
        return {
            "User-Agent": os.getenv("INSTAGRAM_USER_AGENT")
            or (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.instagram.com/",
            "X-IG-App-ID": self.APP_ID,
        }

    def _cookie_header(self) -> str:
        cookie_string = os.getenv("INSTAGRAM_COOKIE_STRING")
        if cookie_string:
            return cookie_string

        session_id = os.getenv("INSTAGRAM_SESSION_ID")
        if not session_id:
            return ""

        session_id = unquote(session_id)
        user_id = session_id.split(":")[0] if ":" in session_id else ""
        parts = [f"sessionid={session_id}"]
        if user_id:
            parts.append(f"ds_user_id={user_id}")
        return "; ".join(parts)

    def _playwright_cookies(self) -> List[Dict[str, str]]:
        cookie_header = self._cookie_header()
        cookies = []
        for raw_cookie in cookie_header.split(";"):
            if "=" not in raw_cookie:
                continue
            name, value = raw_cookie.strip().split("=", 1)
            cookies.append(
                {
                    "name": name,
                    "value": value.strip('"'),
                    "domain": ".instagram.com",
                    "path": "/",
                }
            )
        return cookies

    def _extract_username(self, value: str) -> Optional[str]:
        value = (value or "").strip()
        if not value:
            return None
        if not value.startswith("http"):
            return value.lstrip("@").strip("/")

        parsed = urlparse(value)
        parts = [part for part in parsed.path.split("/") if part]
        if not parts:
            return None
        if parts[0] in {"p", "reel", "tv", "stories"}:
            return None
        return parts[0].lstrip("@")

    def _get_limit(self) -> int:
        try:
            config = json.loads(self.source.crawl_policy) if self.source.crawl_policy else {}
            return int(config.get("limit", self.DEFAULT_LIMIT))
        except Exception:
            return self.DEFAULT_LIMIT

    def _looks_like_instagram_data_url(self, url: str) -> bool:
        return any(
            marker in url
            for marker in (
                "/api/v1/feed/user/",
                "/api/v1/users/web_profile_info/",
                "/graphql/query/",
                "/api/graphql",
            )
        )

    def _node_identity(self, node: Dict[str, Any]) -> Optional[str]:
        value = node.get("code") or node.get("shortcode") or node.get("pk") or node.get("id")
        return str(value) if value else None

    def _nested_count(self, node: Dict[str, Any], nested_key: str, direct_key: str):
        nested = node.get(nested_key)
        if isinstance(nested, dict) and nested.get("count") is not None:
            return nested.get("count")
        return node.get(direct_key)

    def _extract_json_objects(self, text: str) -> List[str]:
        objects: List[str] = []
        stack = []
        start = None
        in_string = False
        escaped = False

        for index, char in enumerate(text):
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
            elif char == "{":
                if not stack:
                    start = index
                stack.append(char)
            elif char == "}" and stack:
                stack.pop()
                if not stack and start is not None:
                    candidate = text[start : index + 1]
                    if len(candidate) > 200:
                        objects.append(candidate)
                    start = None

        return objects
