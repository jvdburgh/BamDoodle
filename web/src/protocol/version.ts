/** The release this web app was built for (`VITE_BAMDOODLE_VERSION`, set by the Docker build); `dev` locally. */
export const APP_VERSION: string = import.meta.env.VITE_BAMDOODLE_VERSION || "dev";
