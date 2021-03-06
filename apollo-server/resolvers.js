const uuid = require('uuid/v4');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { Op, } = require('sequelize');
const { sequelize, } = require('./models');
const fileExtension = require('file-extension');
const graphqlFields = require('graphql-fields');
const { PubSub, } = require('apollo-server-express');
const { sendConfirmMail, sendContactMail, } = require('./mailer/mailUtils');

const AWS = require('aws-sdk');
AWS.config.loadFromPath(`${__dirname}/config/aws.json`);
const s3 = new AWS.S3();

sequelize.sync({});

// Subscription Websocket
const pubsub = new PubSub();
const REPLY_WRITTEN = 'REPLY_WRITTEN';
const REPLY_REMOVED = 'REPLY_REMOVED';
const REPLY_MODIFIED = 'REPLY_MODIFIED';

// AWS File Upload Handler
const s3DefaultParams = {
  ACL: 'public-read',
  Bucket: 'ajounice',
  Conditions: [
    ['content-length-range', 0, 1024 ** 2 * 20], // Max: 20MB per each
    { acl: 'public-read', }
  ],
};

const handleS3Upload = async (file, bucketDir, key) => {
  const { createReadStream, filename, mimetype, } = await file;
  return new Promise((resolve, reject) => {
    s3.upload({
      ...s3DefaultParams,
      Body: createReadStream(),
      Key: `${bucketDir}/${key}.${fileExtension(filename)}`,
      ContentType: mimetype,
    }, (err, data) => {
      if (err) {
        console.error(`[AWS] ${err}`);
        console.log(err);
        reject(err);
      } else {
        console.log('[AWS] 성공적으로 데이터 업로드 완료');
        console.log(data);
        resolve(data);
      }
    });
  });
};

// JWT Token Verify
const tokenVerify = (token) => (new Promise((resolve, reject) => {
  jwt.verify(token, '4j0uN1ce1', (err, decoded) => {
    if (err) {
      reject(err);
    } else {
      resolve(decoded);
    }
  });
}));

const findOne = async (model, args, info, include = [], order = []) => {
  return await model.findOne({
    attributes: graphqlFields(info),
    where: { ...args, },
    include,
    order,
  });
};

const findAll = async (model, args, info, include = [], order = []) => {
  return await model.findAll({
    attributes: graphqlFields(info),
    where: { ...args, },
    include,
    order,
  });
};

const createOne = async (model, args) => {
  return await model.create({ ...args, });
};

const destroyOne = async (model, args) => {
  return await model.destroy({ where: { ...args, }, });
};

const updateOne = async (model, value, condArgs) => {
  return await model.update(value, { where: { ...condArgs, }, });
};

module.exports = {
  Subscription: {
    replyWritten: {
      subscribe: (root, args, { db, }, info) => pubsub.asyncIterator([REPLY_WRITTEN]),
    },
    replyRemoved: {
      subscribe: (root, args, { db, }, info) => pubsub.asyncIterator([REPLY_REMOVED]),
    },
    replyModified: {
      subscribe: (root, args, { db, }, info) => pubsub.asyncIterator([REPLY_MODIFIED]),
    },
  },
  Query: {
    // College
    async colleges (root, args, { db, }, info) {
      const include = [
        { model: db.Department, as: 'departments', }
      ];
      return await findAll(db.College, args, info, include);
    },
    // Department
    async department (root, args, { db, }, info) {
      return await findOne(db.Department, args, info);
    },
    async departments (root, args, { db, }, info) {
      return await findAll(db.Department, args, info);
    },
    // User
    async user (root, args, { db, }, info) {
      const include = [
        { model: db.Board, as: 'articles', },
        { model: db.BoardComment, as: 'comments', }
      ];
      return await findOne(db.User, args, info, include);
    },
    // 관리자 단독!! 향후 권한 처리
    async users (root, args, { db, }, info) {
      const include = [
        { model: db.Board, as: 'articles', },
        { model: db.BoardComment, as: 'comments', }
      ];
      return await findAll(db.User, args, info, include);
    },
    // Board
    async boards (root, args, { db, }, info) {
      const include = [
        { model: db.Board, as: 'posts', }
      ];
      return await findAll(db.BoardCategory, args, info, include);
    },
    async posts (root, args, { db, }, info) {
      const order = [
        ['reg_dt', 'DESC']
      ];
      const include = [
        { model: db.BoardComment, as: 'comments', },
        { model: db.User, as: 'user', }
      ];
      return await findAll(db.Board, args, info, include, order);
    },
    async paginatedPosts (root, args, { db, }, info) {
      // Pagination Test
      const posts = await db.Board.paginate({
        limit: 1,
      });
      console.log(posts.results[0]);
      const returnType = {
        totalCount: posts.length,
        edges: posts,
      };
      return returnType;
    },
    async post (root, args, { db, }, info) {
      const order = [
        [{ model: db.BoardComment, as: 'comments', }, 'reg_dt', 'DESC'],
        [{ model: db.BoardComment, as: 'comments', }, 'cmt_idx', 'DESC']
      ];
      const include = [
        { model: db.BoardCategory, as: 'category', },
        { model: db.User, as: 'user', },
        { model: db.BoardComment, as: 'comments', include: [{ model: db.User, as: 'commenter', }], }
      ];
      return await findOne(db.Board, args, info, include, order);
    },
    async postsByKeyword (root, args, { db, }, info) {
      const parsedArgs = {
        [Op.or]: [
          { title: { [Op.like]: `%${args.keyword}%`, }, },
          { body: { [Op.like]: `%${args.keyword}%`, }, }
        ],
      };
      const include = [
        { model: db.User, as: 'user', },
        { model: db.BoardComment, as: 'comments', include: [{ model: db.User, as: 'commenter', }], }
      ];
      return await findAll(db.Board, parsedArgs, info, include);
    },
    async comment (root, args, { db, }, info) {
      const include = [
        { model: db.User, as: 'commenter', }
      ];
      return await findOne(db.BoardComment, args, info, include);
    },
    async schedule (root, args, { db, }, info) {
      const response = await fetch(`http://${require('ip').address()}:5000/api/schedule`);
      const result = await response.json();
      return result.result;
    },
    async notice (root, args, { db, }, info) {
      const response = await fetch(`http://${require('ip').address()}:5000/api/notice/${args.code}`);
      const result = await response.json();
      return result.result;
    },
    // Auth
    async doesIDExists (root, args, { db, }, info) {
      const response = await findOne(db.User, args, info);
      if (response) return true;
      else return false;
    },
    async doesEmailExists (root, args, { db, }, info) {
      const response = await findOne(db.User, args, info);
      if (response) return true;
      else return false;
    },
    async doesNickExists (root, args, { db, }, info) {
      const response = await findOne(db.User, args, info);
      if (response) return true;
      else return false;
    },
    async checkTokenValid (root, args, { db, }, info) {
      return await findOne(db.User, args, info);
    },
  },
  Mutation: {
    sendContactMail: async (root, { name, email, content, }) => {
      sendContactMail(name, email, content);
      return true;
    },
    sendRegisterAuthEmail: async (root, { user_nm, email, auth_token, }) => {
      sendConfirmMail(user_nm, email, auth_token, false);
      return true;
    },
    lastLogin: async (root, { user_id, ip, }, { db, }, info) => {
      const updateLastLogin = await updateOne(db.User, { log_ip: ip, log_dt: Date.now(), }, { user_id, });
      if (updateLastLogin) return await findOne(db.User, { user_id, }, info);
      else return {};
    },
    authorize: async (root, args, { db, }, info) => {
      const updateAuthorized = await updateOne(db.User, { auth_email_yn: 'Y', }, args);
      if (updateAuthorized) return true;
      else return false;
    },
    resetEmailToken: async (root, { email, }, { db, }, info) => {
      const salt = await bcrypt.genSalt(10);
      const rawToken = await bcrypt.hash(`AjouNICE!|authToken|${email}|${Date.now()}`, salt);
      const newToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const user = await db.User.update({ auth_token: newToken, auth_email_yn: 'N', }, { where: { email: email, }, });
      sendConfirmMail(undefined, email, newToken, true);
      if (user) return true;
      else return false;
    },
    // Board
    writePost: async (root, args, { db, }, info) => {
      return await createOne(db.Board, args);
    },
    writeReply: async (root, args, { db, }, info) => {
      let result;
      const created = await createOne(db.BoardComment, args);
      if (created) {
        const include = [
          { model: db.User, as: 'commenter', }
        ];
        result = await findOne(db.BoardComment, args, info, include);
        pubsub.publish(REPLY_WRITTEN, { replyWritten: result, });
      }
      return result;
    },
    removeReply: async (root, args, { db, }, info) => {
      const target = await findOne(db.BoardComment, args, info);
      const removed = await destroyOne(db.BoardComment, args);
      pubsub.publish(REPLY_REMOVED, { replyRemoved: target, });
      if (removed) {
        return target;
      } else {
        return false;
      }
    },
    editReply: async (root, args, { db, }, info) => {
      const updated = await updateOne(db.BoardComment, { text: args.text, }, { cmt_idx: args.cmt_idx, });
      if (updated) {
        const include = [
          { model: db.User, as: 'commenter', }
        ];
        const result = await findOne(db.BoardComment, args, info, include);
        pubsub.publish(REPLY_MODIFIED, { replyModified: result, });
        return result;
      } else {
        return {};
      }
    },
    editPost: async (root, args, { db, }, info) => {
      const updated = await updateOne(db.Board, { ...args, }, { board_idx: args.board_idx, });
      if (updated) {
        return await findOne(db.Board, args, info);
      } else {
        return {};
      }
    },
    removePost: async (root, args, { db, }, info) => {
      const removed = await destroyOne(db.Board, args);
      if (removed) {
        return true;
      } else {
        return false;
      }
    },
    uploadedBoardImage: async (root, args, { db, }, info) => {
      const { Location, } = await handleS3Upload(args.file, `board/${args.category_title}`, `${uuid()}_${Date.now().valueOf()}`);
      return await Location;
    },
    uploadedProfileImage: async (root, args, { db, }, info) => {
      const { Location, } = await handleS3Upload(args.file, 'user/profile', `${uuid()}_${Date.now().valueOf()}`);
      return await Location;
    },
    modifiedProfileImage: async (root, { file, user_idx, }, { db, }, info) => {
      const { Location, } = await handleS3Upload(file, 'user/profile', `${uuid()}_${Date.now().valueOf()}`);
      const userProfileUpdated = await updateOne(db.User, { user_profile: Location, }, { user_idx, });
      if (userProfileUpdated) {
        return await Location;
      } else {
        return '';
      }
    },
    uploadedCategoryIcon: async (root, { file, }, { db, }, info) => {
      const { Location, } = await handleS3Upload(file, 'restaurant/icon', `${uuid()}_${Date.now().valueOf()}}`);
      return await Location;
    },
    addCategory: async (root, args, { db, }, info) => {
      const created = await createOne(db.BoardCategory, args);
      if (created) {
        return await findOne(db.BoardCategory, args, info);
      } else {
        return {};
      }
    },
    postViewed: async (root, args, { db, }, info) => {
      const updated = await db.Board.increment('view_cnt', { by: 1, where: { board_idx: args.board_idx, }, });
      if (updated) {
        return await findOne(db.Board, args, info);
      } else {
        return {};
      }
    },
  },
};
