const http = require('http');
const app = require('./middlewares/app');
const { encodeTextBody, } = require('./middlewares/securityModule');

const config = require('./config/config.json');
const { tokenVerify, } = require('./function/jwt/verifier');

const { LoggerExtension, } = require('apollo-server-logger');
const { RedisCache, } = require('apollo-server-cache-redis');
const {
  ApolloServer,
  gql,
} = require('apollo-server-express');

const db = require('./models');
const typeDefs = gql(require('./typeDefs'));
const resolvers = require('./resolvers');

const depthLimit = require('graphql-depth-limit');
const NoIntrospection = require('graphql-disable-introspection');
const { createComplexityLimitRule, } = require('graphql-validation-complexity');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false,
  },
  validationRules: [
    // NoIntrospection, // When Production
    depthLimit(5), // Limited GraphQL Query Depth
    createComplexityLimitRule(800, { // Limited GraphQL Query Complexity
      onCost: cost => console.log(`[Apollo] Query Costs: ${cost}`),
    })
  ],
  engine: { // Connected to Apollo Engine
    apiKey: config.apollo.engine.key,
  },
  persistedQueries: { // Persisted Query
    cache: new RedisCache({
      host: config.development.redis_host,
    }),
  },
  cors: true, // CORS
  cacheControl: {
    defaultMaxAge: 10,
  },
  extensions: [() => new LoggerExtension({ // Logging
    tracing: true,
  })],
  context: async ({ req, }) => {
    let user;
    const token = req.headers.authorization || null;
    if (!token.includes('Bearer')) {
      user = null;
    } else {
      user = (await tokenVerify(token.split(' ')[1])).user;
    }
    return { db, user, };
  },
});

server.applyMiddleware({ app, cors: false, });
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);
httpServer.listen(455);
httpServer.timeout = 5000; // Set Timeout under 5000ms
