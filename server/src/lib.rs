pub mod connection;
pub mod limits;
pub mod protocol;
pub mod registry;
pub mod room;
pub mod words;

use std::{
    path::{Path, PathBuf},
    sync::Arc,
};

use axum::{
    Router,
    extract::{Request, State, ws::WebSocketUpgrade},
    http::{HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
};
use tower::ServiceExt;
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

use crate::registry::Registry;

/// Only our own origin for scripts, sockets, fonts, images and sounds. Inline styles are allowed because React sets
/// canvas sizes and player colours with `style`; there are no inline scripts.
const CONTENT_SECURITY_POLICY: &str = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; \
     img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; \
     base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

/// The whole server: `/ws` for the game, `/api/health`, the web app's files, and the app itself for its own routes.
pub fn app(registry: Arc<Registry>, static_dir: &Path) -> Router {
    let index = Arc::new(static_dir.join("index.html"));
    let app_routes = get(app_route).with_state(index);

    Router::new()
        .route("/api/health", get(|| async { "ok" }))
        .route("/ws", get(websocket))
        .with_state(registry)
        .fallback_service(ServeDir::new(static_dir).fallback(app_routes))
        .layer(middleware::from_fn(headers))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
}

async fn websocket(upgrade: WebSocketUpgrade, State(registry): State<Arc<Registry>>) -> Response {
    upgrade
        .max_message_size(limits::MAX_MESSAGE_BYTES)
        .on_upgrade(move |socket| connection::handle(socket, registry))
}

/// Paths that aren't files are the web app's own routes (`/join/BKTZ`, `/watch/BKTZ`, `/lab`): serve the app and let
/// it route. A path that looks like a file, or an unknown `/api/` path, is a real 404.
async fn app_route(State(index): State<Arc<PathBuf>>, request: Request) -> Response {
    let path = request.uri().path();
    let looks_like_a_file = path.rsplit('/').next().is_some_and(|last| last.contains('.'));
    if looks_like_a_file || path.starts_with("/api/") || path.starts_with("/assets/") {
        return (StatusCode::NOT_FOUND, "Not found").into_response();
    }
    match ServeFile::new(index.as_ref()).oneshot(request).await {
        Ok(response) => response.into_response(),
        Err(never) => match never {},
    }
}

/// Security headers on everything; build output in `/assets/` (hashed names) cached for a year, the rest revalidated.
async fn headers(request: Request, next: Next) -> Response {
    let hashed_asset = request.uri().path().starts_with("/assets/");
    let mut response = next.run(request).await;
    let fresh = response.status().is_success() || response.status() == StatusCode::NOT_MODIFIED;
    let cache = if hashed_asset && fresh {
        "public, max-age=31536000, immutable"
    } else {
        "no-cache"
    };
    let headers = response.headers_mut();
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static(cache));
    headers.insert(
        header::STRICT_TRANSPORT_SECURITY,
        HeaderValue::from_static("max-age=31536000"),
    );
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static(CONTENT_SECURITY_POLICY),
    );
    headers.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=(), payment=()"),
    );
    response
}

#[cfg(test)]
mod tests {
    use std::fs;

    use axum::body::{Body, to_bytes};

    use super::*;
    use crate::words::WordLibrary;

    fn site() -> (Router, PathBuf) {
        let dir = std::env::temp_dir().join(format!(
            "bamdoodle-site-{}-{}",
            std::process::id(),
            rand::random::<u32>()
        ));
        fs::create_dir_all(dir.join("assets")).unwrap();
        fs::write(dir.join("index.html"), "<div id=\"root\"></div>").unwrap();
        fs::write(dir.join("assets/index-abc123.js"), "console.log(1)").unwrap();
        fs::write(dir.join("favicon.ico"), "icon").unwrap();
        (app(Registry::new(Arc::new(WordLibrary::default())), &dir), dir)
    }

    async fn get(router: &Router, path: &str) -> (StatusCode, axum::http::HeaderMap, String) {
        let response = router
            .clone()
            .oneshot(Request::get(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = response.status();
        let headers = response.headers().clone();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        (status, headers, String::from_utf8_lossy(&body).into_owned())
    }

    #[tokio::test]
    async fn app_routes_get_the_app_and_missing_files_get_a_404() {
        let (router, dir) = site();
        for path in ["/", "/join/BKTZ", "/watch/BKTZ", "/lab"] {
            let (status, _, body) = get(&router, path).await;
            assert_eq!(
                (status, body.as_str()),
                (StatusCode::OK, "<div id=\"root\"></div>"),
                "{path}"
            );
        }
        for path in [
            "/nonexistent.js",
            "/assets/old-hash.js",
            "/assets/",
            "/assets/nodot",
            "/api/nope",
            "/robots.txt",
        ] {
            let (status, _, _) = get(&router, path).await;
            assert_eq!(status, StatusCode::NOT_FOUND, "{path}");
        }
        assert_eq!(get(&router, "/favicon.ico").await.0, StatusCode::OK);
        fs::remove_dir_all(dir).unwrap();
    }

    #[tokio::test]
    async fn hashed_assets_are_cached_for_a_year_and_the_page_is_revalidated() {
        let (router, dir) = site();
        let (_, asset, _) = get(&router, "/assets/index-abc123.js").await;
        assert_eq!(asset[header::CACHE_CONTROL], "public, max-age=31536000, immutable");
        let (_, page, _) = get(&router, "/").await;
        assert_eq!(page[header::CACHE_CONTROL], "no-cache");
        let (_, missing, _) = get(&router, "/assets/old-hash.js").await;
        assert_eq!(
            missing[header::CACHE_CONTROL],
            "no-cache",
            "a 404 is never cached for a year"
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[tokio::test]
    async fn every_response_carries_the_security_headers() {
        let (router, dir) = site();
        for path in ["/", "/api/health", "/nonexistent.js"] {
            let (_, headers, _) = get(&router, path).await;
            assert_eq!(headers[header::STRICT_TRANSPORT_SECURITY], "max-age=31536000", "{path}");
            assert!(
                headers[header::CONTENT_SECURITY_POLICY]
                    .to_str()
                    .unwrap()
                    .contains("script-src 'self'")
            );
            assert_eq!(headers[header::X_FRAME_OPTIONS], "DENY");
            assert_eq!(headers[header::X_CONTENT_TYPE_OPTIONS], "nosniff");
        }
        fs::remove_dir_all(dir).unwrap();
    }
}
