"use server";
let cachedToken = null;
let tokenExpiry = null;

export async function getAuthToken() {
  //If the token exists and it has not expired, return it
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    //Otherwise request a new one
    const res = await fetch(
      "https://erp.example.com/auth/api/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-tenanttype": "TENANT",
        },
        body: JSON.stringify({
          apiKey: process.env.ERP_API_KEY,
        }),
      },
    );

    if (!res.ok) throw new Error("Failed to fetch auth token");

    const data = await res.json();
    //Save token and compute expiry
    cachedToken = data.token;
    tokenExpiry = Date.now() + 14 * 60 * 1000; //14 minutes delay (1 minute buffer)

    return cachedToken;
  } catch (error) {
    console.error("A network error occured:", error);
    return null;
  }
}
