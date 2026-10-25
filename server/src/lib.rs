pub mod connection;
pub mod limits;
pub mod logging;
pub mod protocol;
pub mod registry;
pub mod room;
pub mod usage;
pub mod words;

use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Request, State, ws::WebSocketUpgrade},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use tower::ServiceExt;
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

use crate::{connection::RateLimiter, protocol::ClientErrorReport, registry::Registry};

/// The release this binary was built for, baked in by the Docker build (`BAMDOODLE_VERSION`); `dev` otherwise.
pub const VERSION: &str = match option_env!("BAMDOODLE_VERSION") {
    Some(version) => version,
    None => "dev",
};

/// Only our own origin for scripts, sockets, fonts, images and sounds. Inline styles are allowed because React sets
/// canvas sizes and player colours with `style`; there are no inline scripts.
const CONTENT_SECURITY_POLICY: &str = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; \
     img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; \
     base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

/// The whole server: `/ws` for the game, `/api/health`, the web app's files, and the app itself for its own routes.
pub fn app(registry: Arc<Registry>, static_dir: &Path) -> Router {
    let index = Arc::new(static_dir.join("index.html"));
    let app_routes = get(app_route).with_state(index);
    let reports = Arc::new(Mutex::new(RateLimiter::new(
        limits::CLIENT_ERRORS_PER_MINUTE,
        Duration::from_secs(60),
    )));
    let client_errors = post(move |headers: HeaderMap, Json(report): Json<ClientErrorReport>| {
        client_error(reports.clone(), headers, report)
    })
    .layer(DefaultBodyLimit::max(limits::CLIENT_ERROR_BYTES));

    Router::new()
        .route("/api/health", get(|| async { "ok" }))
        .route("/api/version", get(|| async { VERSION }))
        .route("/api/room-defaults", get(room_defaults))
        .route("/api/client-error", client_errors)
        .route("/ws", get(websocket))
        .with_state(registry)
        .fallback_service(ServeDir::new(static_dir).fallback(app_routes))
        .layer(middleware::from_fn(headers))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
}

async fn room_defaults(State(registry): State<Arc<Registry>>) -> axum::Json<protocol::RoomDefaults> {
    let words = registry.words();
    axum::Json(protocol::RoomDefaults {
        settings: room::Room::default_settings(words),
        word_categories: words.catalogue(),
    })
}

/// A browser's error, into the logs (`bamdoodle::client_error`) for Cockpit and its alert. Cut to size, never the
/// IP address; over the server-wide limit per minute it's dropped.
async fn client_error(reports: Arc<Mutex<RateLimiter>>, headers: HeaderMap, report: ClientErrorReport) -> StatusCode {
    let allowed = reports
        .lock()
        .expect("never poisoned: nothing panics while holding it")
        .allow(Instant::now());
    if !allowed {
        return StatusCode::TOO_MANY_REQUESTS;
    }
    let cut = |text: &str, max: usize| text.chars().take(max).collect::<String>();
    let page = match report.page.as_str() {
        page @ ("start" | "join" | "watch") => page,
        _ => "other",
    };
    let browser = headers
        .get(header::USER_AGENT)
        .and_then(|agent| agent.to_str().ok())
        .map(|agent| cut(agent, limits::CLIENT_ERROR_AGENT_CHARS))
        .unwrap_or_default();
    tracing::warn!(
        target: "bamdoodle::client_error",
        version = %cut(&report.version, 40),
        page,
        // Not `message`: that's the log line's own field in the JSON.
        error = %cut(&report.message, limits::CLIENT_ERROR_MESSAGE_CHARS),
        stack = %cut(report.stack.as_deref().unwrap_or_default(), limits::CLIENT_ERROR_STACK_CHARS),
        %browser,
        "client error"
    );
    StatusCode::NO_CONTENT
}

async fn websocket(upgrade: WebSocketUpgrade, State(registry): State<Arc<Registry>>) -> Response {
    upgrade
        .max_message_size(limits::MAX_MESSAGE_BYTES)
        .on_upgrade(move |socket| connection::handle(socket, registry))
}

/// Paths that aren't files are the web app's own routes (`/BKTZ`, `/watch/BKTZ`): serve the app and let
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
        for path in ["/", "/BKTZ", "/watch/BKTZ"] {
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
            "/nonexistent.txt",
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
    async fn a_host_can_set_up_a_room_before_it_exists() {
        let words = WordLibrary::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../words")).unwrap();
        let dir = std::env::temp_dir();
        let router = app(Registry::new(Arc::new(words)), &dir);
        let (status, headers, body) = get(&router, "/api/room-defaults").await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(headers[header::CONTENT_TYPE], "application/json");
        let defaults: protocol::RoomDefaults = serde_json::from_str(&body).unwrap();
        assert!(!defaults.settings.categories.is_empty());
        assert!(defaults.word_categories.iter().any(|category| category.adult));
    }

    async fn report(router: &Router, body: String) -> StatusCode {
        let request = Request::post("/api/client-error")
            .header(header::CONTENT_TYPE, "application/json")
            .header(
                header::USER_AGENT,
                "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
            )
            .body(Body::from(body))
            .unwrap();
        router.clone().oneshot(request).await.unwrap().status()
    }

    #[tokio::test]
    async fn browser_errors_are_taken_within_limits() {
        let (router, dir) = site();
        let valid = r#"{"message":"boom","stack":null,"version":"v0.1.5","page":"join"}"#.to_owned();
        let (_guard, events) = crate::logging::capture::start();
        assert_eq!(report(&router, valid.clone()).await, StatusCode::NO_CONTENT);
        let sneaky = format!(
            r#"{{"message":"{}","stack":"{}","version":"v0.1.5","page":"join/BKZW"}}"#,
            "m".repeat(1_000),
            "s".repeat(5_000)
        );
        assert_eq!(report(&router, sneaky).await, StatusCode::NO_CONTENT);
        {
            let logged = events.lock().unwrap();
            let reports: Vec<_> = logged
                .iter()
                .filter(|(target, _)| target == "bamdoodle::client_error")
                .map(|(_, fields)| fields)
                .collect();
            assert_eq!(reports.len(), 2);
            assert_eq!(reports[0]["page"], "join");
            assert_eq!(
                reports[1]["page"], "other",
                "only known screens: never a code from the path"
            );
            assert_eq!(reports[1]["error"].chars().count(), limits::CLIENT_ERROR_MESSAGE_CHARS);
            assert_eq!(reports[1]["stack"].chars().count(), limits::CLIENT_ERROR_STACK_CHARS);
            assert!(reports[1]["browser"].starts_with("Mozilla/5.0 (Android 14"));
        }
        assert_eq!(report(&router, "not json".into()).await, StatusCode::BAD_REQUEST);
        let huge = format!(
            r#"{{"message":"{}","stack":null,"version":"v0.1.5","page":"join"}}"#,
            "x".repeat(limits::CLIENT_ERROR_BYTES)
        );
        assert_eq!(report(&router, huge).await, StatusCode::PAYLOAD_TOO_LARGE);
        for _ in 2..limits::CLIENT_ERRORS_PER_MINUTE {
            assert_eq!(report(&router, valid.clone()).await, StatusCode::NO_CONTENT);
        }
        assert_eq!(
            report(&router, valid).await,
            StatusCode::TOO_MANY_REQUESTS,
            "a burst from every tab of a broken release doesn't flood the logs"
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[tokio::test]
    async fn any_user_agent_is_logged_as_sent_cut_to_size() {
        let (router, dir) = site();
        let (_guard, events) = crate::logging::capture::start();
        let body = r#"{"message":"boom","stack":null,"version":"v0.1.5","page":"start"}"#;
        let agents = [
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)".to_owned(),
            "x".repeat(5_000),
            String::new(),
        ];
        for agent in &agents {
            let request = Request::post("/api/client-error")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::USER_AGENT, agent.as_str())
                .body(Body::from(body))
                .unwrap();
            assert_eq!(
                router.clone().oneshot(request).await.unwrap().status(),
                StatusCode::NO_CONTENT
            );
        }
        // Not valid UTF-8: still taken, with no agent.
        let request = Request::post("/api/client-error")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::USER_AGENT, HeaderValue::from_bytes(b"caf\xe9").unwrap())
            .body(Body::from(body))
            .unwrap();
        assert_eq!(
            router.clone().oneshot(request).await.unwrap().status(),
            StatusCode::NO_CONTENT
        );

        let logged = events.lock().unwrap();
        let browsers: Vec<_> = logged
            .iter()
            .filter(|(target, _)| target == "bamdoodle::client_error")
            .map(|(_, fields)| fields["browser"].clone())
            .collect();
        assert_eq!(browsers[0], agents[0]);
        assert_eq!(browsers[1].chars().count(), limits::CLIENT_ERROR_AGENT_CHARS);
        assert_eq!(browsers[2], "");
        assert_eq!(browsers[3], "");
        drop(logged);
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
