export const API_BASE_URL =
    "http://0.0.0.0:8000";

function getToken() {

    return localStorage.getItem(
        "token"
    );

}

export async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
) {

    const token = getToken();

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {

            ...options,

            headers: {

                ...(options.headers ?? {}),

                ...(token
                    ? {
                        Authorization:
                            `Bearer ${token}`,
                    }
                    : {}),

            },

        }
    );

    return response;

}