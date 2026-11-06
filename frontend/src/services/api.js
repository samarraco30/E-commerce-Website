import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

api.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        config.headers.delete("Content-Type");
    }

    const token =
        window.localStorage.getItem("altf4.auth.token") ||
        window.sessionStorage.getItem("altf4.auth.token");

    if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
});

export default api;