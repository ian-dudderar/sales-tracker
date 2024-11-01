import "@shopify/shopify-api/adapters/node";
import { ApiVersion, shopifyApi } from "@shopify/shopify-api";
import { restResources } from "@shopify/shopify-api/rest/admin/2023-04";

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

    const orders = await shopify.rest.Order.all({
      session: session,
      status: "any",
      created_at_min: "2024-10-14T04:00:00Z",
    });

    let orderData = [];

    for (const order of orders.data) {
      orderData.push(parseFloat(order.total_price));
    }

    const total = Math.round(orderData.reduce((a, b) => a + b, 0) * 100) / 100;
    return orders.data;
  }

  async setWebhooks() {
    const shopify = this.getClient();
    const session = this.getSession();
    const graphQLClient = new shopify.clients.Graphql({ session });

    // const CALLBACK_URL = process.env["URL"];
    const CALLBACK_URL = process.env["CALLBACK_URL"];

    // const webhookTopics = ["ORDERS_PAID", "REFUNDS_CREATE", "CARTS_UPDATE"];
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
