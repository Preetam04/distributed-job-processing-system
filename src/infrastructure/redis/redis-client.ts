import { createClient } from "redis";
import { REDIS_URL } from "../../env";

const redis = createClient({
  url: REDIS_URL,
});

await redis.connect().catch((err) => {
  console.log(err);

  console.log("Something went wrong");
});

export default redis;
