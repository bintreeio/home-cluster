import { BitwardenClient} from "@bitwarden/sdk-napi";

export default async function getSecret(id: string): Promise<string> {

    if (!process.env.BWS_ACCESS_TOKEN) {
        throw new Error("BWS_ACCESS_TOKEN is not set");
    }
    const client = new BitwardenClient();
    await client.auth().loginAccessToken(process.env.BWS_ACCESS_TOKEN);
    const secret = await client.secrets().get(id);

    return secret.value;
}


getSecret("4826f8d7-3f2e-4516-80fe-b49f007548df").then(console.log);