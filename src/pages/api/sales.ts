import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import ShopifyConnector from "@/utils/shopify-connector";

const router = createRouter<NextApiRequest, NextApiResponse>();

const URL = process.env["LOCAL_URL"];

router.post(async (req: any, res: any) => {
  const orderTotal = req.body.total_price;
  console.log("received order total: ", orderTotal);

  fetch(
    `https://maxwood-sales-tracker-9adad0088d36.herokuapp.com/api/websocket`,
    {
      method: "POST",
      body: JSON.stringify(orderTotal),
    }
  );
  res.status(200).json({ message: "success" });
});

router.get(async (req: any, res: any) => {
  const shopify = ShopifyConnector.getInstance();
  const orders = await shopify.getShopifyOrders();
  let orderData = [];
  for (const order of orders) {
    orderData.push(parseFloat(order.total_price));
  }
  const total = Math.round(orderData.reduce((a, b) => a + b, 0) * 100) / 100;

  console.log(total);
  res.status(200).json({ total });
});

export default router.handler({
  onError: (err: any, req: any, res: any) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).end(err.message);
  },
});
