import "server-only";
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments } from "plaid";

const plaidEnv = process.env.PLAID_ENV ?? "sandbox";

const configuration = new Configuration({
  basePath:
    plaidEnv === "production"
      ? PlaidEnvironments.production
      : plaidEnv === "development"
      ? PlaidEnvironments.development
      : PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export async function getInstitutionInfo(institutionId: string) {
  try {
    const response = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
      options: {
        include_optional_metadata: true,
      },
    });

    return {
      name: response.data.institution.name,
      logoUrl: response.data.institution.logo
        ? `data:image/png;base64,${response.data.institution.logo}`
        : null,
    };
  } catch (err) {
    console.error("[plaid] institutionsGetById failed for institution:", institutionId, err);
    return null;
  }
}