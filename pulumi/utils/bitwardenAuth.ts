import { BitwardenClient } from "@bitwarden/sdk-napi";

// One login shared across all getSecret calls — per-call logins trip
// Bitwarden's rate limit (429) once a stack reads more than a few secrets.
let clientPromise: Promise<BitwardenClient> | undefined;

function getClient(): Promise<BitwardenClient> {
    if (!clientPromise) {
        clientPromise = (async () => {
            if (!process.env.BWS_ACCESS_TOKEN) {
                throw new Error("BWS_ACCESS_TOKEN is not set");
            }
            const client = new BitwardenClient();
            await client.auth().loginAccessToken(process.env.BWS_ACCESS_TOKEN);
            return client;
        })();
    }
    return clientPromise;
}

export default async function getSecret(id: string): Promise<string> {
    const client = await getClient();
    for (let attempt = 1; ; attempt++) {
        try {
            const secret = await client.secrets().get(id);
            return secret.value;
        } catch (e) {
            if (attempt >= 5 || !String(e).includes("429")) throw e;
            await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
    }
}
