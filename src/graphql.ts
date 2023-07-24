import { GraphQLResponse, createGql } from "@ryanccn/gql";
import type { LanguageQueryQuery, LanguageQueryQueryVariables } from "./graphql.generated";

const gql = createGql("https://api.github.com/graphql", {
	headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
});

export const languageQuery = async (variables: LanguageQueryQueryVariables) => {
	return gql`
		query LanguageQuery($after: String) {
			viewer {
				login

				repositories(
					first: 100
					privacy: PUBLIC
					orderBy: { field: UPDATED_AT, direction: DESC }
					isFork: false
					after: $after
				) {
					nodes {
						name
						owner {
							__typename
							login
						}
						nameWithOwner

						languages(first: 10) {
							edges {
								size
								node {
									name
									color
								}
							}
						}
					}

					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}
		}
	`(variables) as Promise<GraphQLResponse<{ data: LanguageQueryQuery }>>;
};
