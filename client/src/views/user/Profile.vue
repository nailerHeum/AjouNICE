<template>
  <div class="wrapper">
    <Navigation is-static />
    <main>
      <div class="wrapper">
        <section class="my my-profile">
          <header>
            <h2>
              <span
                id="username"
                class="underline underline-animated"
              >
                <strong>{{ user.user_nm }}</strong>
              </span>
              <span>님, 환영합니다.</span>
            </h2>
          </header>
          <div class="content">
            <div class="card">
              <div class="card-content">
                <div class="columns">
                  <div class="column is-3 has-text-centered">
                    <figure>
                      <div class="cover new-gravatar">
                        <b-upload
                          v-model="thumbnail"
                          accept="image/*"
                        >
                          <strong>변경</strong>
                        </b-upload>
                      </div>
                      <img
                        v-show="user.user_profile"
                        :src="user.user_profile"
                        :alt="user.user_nm"
                      >
                      <v-gravatar
                        v-show="!user.user_profile"
                        :email="$store.state.user.email"
                      />
                    </figure>
                    <p v-show="!user.user_profile">
                      지정하신 프로필 이미지가 없어 기본 이미지를 표시합니다.
                    </p>
                  </div>
                  <div class="column is-9">
                    <p class="nickname">
                      <span class="header">
                        <strong>닉네임</strong>
                      </span>&nbsp;
                      <span class="content">{{ user.nick_nm }}</span>
                    </p>
                    <p class="dpts">
                      <span class="header">
                        <strong>소속학과</strong>
                      </span>&nbsp;
                      <span class="content">{{ dpt_cd_labels.join(' | ') }}</span>
                    </p>
                  </div>
                </div>
                <hr>
                <div class="controls has-text-centered">
                  <header>
                    <strong>계정관리</strong>
                  </header>
                  <div class="buttons">
                    <b-button
                      v-show="user.admin_type === 'A'"
                      type="is-primary"
                      size="is-small"
                      tag="router-link"
                      to="/gate/manager"
                    >
                      <font-awesome-icon icon="users-cog" />&nbsp;
                      <span>관리자</span>
                    </b-button>
                    <b-button
                      type="is-warning"
                      size="is-small"
                      tag="router-link"
                      :to="profileEditUrl"
                    >
                      <font-awesome-icon icon="user-lock" />&nbsp;
                      <span>계정정보 수정</span>
                    </b-button>
                    <b-button
                      type="is-danger"
                      size="is-small"
                      @click="secession"
                    >
                      <font-awesome-icon icon="sign-out-alt" />&nbsp;
                      <span>회원탈퇴</span>
                    </b-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <hr>
        <b-table
          :data="user.articles"
          :narrowed="true"
          :focusable="true"
          :mobile-cards="false"
        >
          <template slot-scope="props">
            <b-table-column
              field="title"
              label="제목"
            >
              <router-link :to="`/board/${props.row.board_idx}/view`">
                {{ props.row.title }}
              </router-link>
            </b-table-column>
            <b-table-column
              field="category_idx"
              label="카테고리"
            >
              {{ props.row.category_idx }}
            </b-table-column>
            <b-table-column
              field="view_cnt"
              label="조회"
            >
              {{ props.row.view_cnt | numberWithCommas }}회
            </b-table-column>
            <b-table-column
              field="reg_dt"
              label="작성일"
            >
              {{ props.row.reg_dt | formatDateTime }}
            </b-table-column>
          </template>
        </b-table>
        <!-- <MyPosts :posts="user.articles" /> -->
        <hr>
        <MyReviews />
        <hr>
        <section class="my my-notice">
          <header class="underline underline-inline-block">
            <strong>소속학과 공지사항</strong>
          </header>
          <b-table
            :data="dpt.data"
            :loading="loading"
            :narrowed="true"
            :focusable="true"
            :mobile-cards="false"
          >
            <template slot-scope="props">
              <b-table-column
                field="title"
                label="제목"
              >
                <a
                  :href="props.row.link"
                  target="_blank"
                >
                  <h5>{{ props.row.title }}</h5>
                </a>
              </b-table-column>
              <b-table-column
                field="unit"
                label="부서"
                sortable
              >
                {{ props.row.unit }}
              </b-table-column>
            </template>
          </b-table>
        </section>
      </div>
    </main>
    <Footer />
  </div>
</template>

<script>
import urljoin from 'url-join'
import gql from 'graphql-tag'
import { User, Notice } from '@/assets/graphql/queries'
import { ModifiedProfileImageURL } from '@/assets/graphql/mutations'
import { Navigation, MyPosts, MyReviews, Footer } from '@/components'
export default {
  components: {
    Navigation,
    MyPosts,
    MyReviews,
    Footer
  },
  data () {
    return {
      scrollBase: null,
      thumbnail: null,
      user: {
        user_nm: '',
        user_profile: '',
        nick_nm: '',
        dpt_cd: '',
        admin_type: '',
        user_type: '',
        articles: []
      },
      loading: true,
      dpt_cds: [],
      dpt_cd_labels: [],
      dpt: {
        data: []
      }
    }
  },
  computed: {
    profileEditUrl () {
      return urljoin(this.$route.path, '/edit')
    },
    myLectureReviewsLink () {
      return '/my/lectures/reviews'
    }
  },
  watch: {
    thumbnail (file) {
      // S3 업로드 및 즉각 썸네일 반영
      this.$apollo.mutate({
        mutation: gql`${ModifiedProfileImageURL}`,
        variables: {
          file,
          user_idx: this.$store.state.user.idx
        }
      }).then(({ data: { modifiedProfileImage } }) => {
        this.user.user_profile = modifiedProfileImage
      })
    }
  },
  beforeCreate () {
    this.$apollo.query({
      query: gql`${User}`,
      variables: {
        id: this.$store.state.user.idx
      }
    }).then(({ data: { user } }) => {
      this.user = user
      this.dpt_cds = user.dpt_cd.split(',')
      this.dpt_cds.forEach(dpt => {
        this.$apollo.query({
          query: gql`{
            department(dpt_cd: "${dpt}") {
              dpt_nm
            }
          }`
        }).then(({ data: { department } }) => {
          this.dpt_cd_labels.push(department.dpt_nm)
        })
      })
      this.loadNotice()
    })
  },
  beforeMount () {
    document.body.classList.add('loading')
  },
  mounted () {
    document.body.classList.remove('loading')
  },
  beforeUpdate () {
    document.body.classList.add('loading')
  },
  updated () {
    document.body.classList.remove('loading')
  },
  methods: {
    loadNotice () {
      for (const dpt of this.dpt_cds) {
        this.$apollo.query({
          query: gql`${Notice}`,
          variables: {
            code: dpt
          }
        }).then(({ data }) => {
          this.dpt.data = this.dpt.data.concat(data.notice)
        })
      }
      this.loading = false
    },
    secession () {
      this.$swal({
        title: '정말 탈퇴하시겠습니까?',
        type: 'question',
        text: '탈퇴하시면 30일간 재가입이 불가합니다. 작성하신 모든 게시물은 삭제되나, 계정정보는 동의하셨던 약관 내용에 따라 1년간 보관후 폐기됩니다.',
        footer: '동의하시면 계속 진행하여주세요.',
        showCancelButton: true,
        confirmButtonText: '탈퇴',
        cancelButtonText: '취소',
        showLoaderOnConfirm: true,
        preConfirm: () => {
          return '탈퇴'
        }
      }).then((result) => {
        if (result.value) {
          // 탈퇴 진행
          this.$store.dispatch('LOGOUT').then(() => {
            this.flashSuccess('탈퇴되었습니다.')
            this.$router.push('/')
          })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>

section.my {
  margin: {
    bottom: 1rem;
  }
  &-profile {
    & .controls {
      display: grid;
      grid-template-columns: 1fr 2fr;
    }
  }
}

tr {
  & td::before {
    white-space: nowrap;
  }
}

.card-content {
  padding: 1.5rem 1rem;
}

.buttons {
  justify-content: center;
}

.select select {
  margin-top: 0 !important;
}

.notice {
  > .card {
    margin-bottom: .8rem;
    & .title {
      font-size: 1.2rem;
    }
    & .subtitle {
      font-size: .8rem;
    }
  }
}

</style>
