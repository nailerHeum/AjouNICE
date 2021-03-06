import writePost from './writePost.graphql'
import writeReply from './writeReply.graphql'
import removeReply from './removeReply.graphql'
import editReply from './editReply.graphql'
import editPost from './editPost.graphql'
import removePost from './removePost.graphql'
import IncrementViewCount from './postViewed.graphql'

import LoggedInLogger from './auth/LoggedInLogger.graphql'
import Authorize from './auth/Authorize.graphql'
import UploadedProfileImageURL from './auth/UploadedProfileImageURL.graphql'
import ModifiedProfileImageURL from './auth/ModifiedProfileImageURL.graphql'

import UploadedCategoryIcon from './admin/UploadedCategoryIcon.graphql'
import addCategory from './admin/addCategory.graphql'

export {
  writeReply,
  removeReply,
  editReply,
  writePost,
  editPost,
  removePost,
  IncrementViewCount,
  LoggedInLogger,
  Authorize,
  UploadedProfileImageURL,
  ModifiedProfileImageURL,
  UploadedCategoryIcon,
  addCategory
}
