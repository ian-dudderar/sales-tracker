import "@shopify/shopify-api/adapters/node";
import {
  ApiVersion,
  shopifyApi,
  RestRequestReturn,
} from "@shopify/shopify-api";
import { restResources } from "@shopify/shopify-api/rest/admin/2023-04";
import fs from "fs";

export default class ShopifyConnector {
  public static instance: ShopifyConnector;

  static getInstance() {
    if (!ShopifyConnector.instance) {
      ShopifyConnector.instance = new ShopifyConnector();
    }
    return ShopifyConnector.instance;
  }

  private client: any;

  constructor() {
    this.client = null;
  }

  getClient() {
    const API_KEY = process.env["ML_API_KEY"];
    const API_SECRET = process.env["ML_API_SECRET"];
    const ACCESS_TOKEN = process.env["ML_ACCESS_TOKEN"];
    const STORE_URL = process.env["ML_STORE_URL"];
    if (!API_SECRET) {
      throw new Error("API_SECRET is not defined");
    }
    let shopify;
    if (this.client !== null) {
      shopify = this.client;
    } else {
      shopify = shopifyApi({
        apiKey: API_KEY,
        apiSecretKey: API_SECRET,
        adminApiAccessToken: ACCESS_TOKEN,
        apiVersion: ApiVersion.April23,
        isCustomStoreApp: true,
        scopes: [],
        isEmbeddedApp: false,
        hostName: STORE_URL || "",
        restResources,
      });
      this.client = shopify;
    }
    if (!shopify) {
      throw new Error(`Could not create shopify client`);
    }

    return shopify;
  }

  getSession() {
    const shopify = this.getClient();
    const session = shopify.session.customAppSession(shopify.config.hostName);
    return session;
  }

  async getShopifyOrders() {
    const shopify = this.getClient();
    const session = this.getSession();
    // Lets remove orders that are 'cancelled' based on status

    let pageInfo: RestRequestReturn["pageInfo"] | undefined;
    let pageData: any[] = [];

    let query = {
      limit: 250,
      status: "any",
      created_at_min: "2024-11-27T05:00:00Z",
    };

    do {
      try {
        let data = {};
        if (pageInfo && pageInfo.nextPage) {
          data = pageInfo.nextPage.query;
        } else {
          data = query;
        }

        // Get orders
        const response = await shopify.rest.Order.all({
          session: session,
          ...data,
        });
        const page = response.data;
        // Add products to pageData
        pageData = [...pageData, ...page];

        // Set pageInfo to the next page
        pageInfo = response.pageInfo;
      } catch (error) {
        console.error(error);
      }
    } while (pageInfo?.nextPage);
    let x = pageData.length;
    // console.log(pageData[x - 1]);

    fs.writeFileSync(`./orders-ml.json`, JSON.stringify(pageData));

    return pageData;
  }

  async setWebhooks() {
    const shopify = this.getClient();
    const session = this.getSession();
    const graphQLClient = new shopify.clients.Graphql({ session });

    const CALLBACK_URL = process.env["URL"];
    // const CALLBACK_URL = "https://e7a9-98-124-79-64.ngrok-free.app";
    // const CALLBACK_URL = process.env["CALLBACK_URL"];

    const webhookTopics = ["ORDERS_PAID"];
    for (const topic of webhookTopics) {
      console.log("creating webhook for...", topic);
      console.log("on...", CALLBACK_URL);
      const webhook = await graphQLClient.query({
        data: {
          query: `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
            webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
              webhookSubscription {
                id
                topic
                format
                endpoint {
                  __typename
                  ... on WebhookHttpEndpoint {
                    callbackUrl
                  }
                }
              }
            }
          }`,
          variables: {
            topic,
            webhookSubscription: {
              callbackUrl: `${CALLBACK_URL}/api/sales`,
              format: "JSON",
            },
          },
        },
      });
    }
  }
}
