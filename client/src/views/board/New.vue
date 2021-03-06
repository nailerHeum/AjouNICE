<template>
  <div class="wrapper">
    <Navigation is-static />
    <main>
      <div class="wrapper container">
        <header class="underline underline-inline-block underline-animated">
          <strong>게시물 작성</strong>
        </header>
        <form
          data-post-form
          autocomplete="off"
          @submit.prevent
        >
          <div class="content-wrapper">
            <div
              class="input-form"
            >
              <label for="category">게시판명</label>
              <div class="input-form-group">
                <v-select
                  v-model="selectedCategory"
                  placeholder="게시판 분류 선택"
                  :value="selectedCategory"
                  :options="categories"
                  :reduce="options => options.category_idx"
                  label="category_nm"
                  @input="getCateDepth1()"
                />
                <v-select
                  v-if="sub_categories"
                  v-model="selectedSubCategory"
                  placeholder="게시판 하위 분류 선택"
                  :value="selectedSubCategory"
                  :options="sub_categories"
                  :reduce="options => options.category_idx"
                  label="category_nm"
                  :disabled="depth1Deactivated"
                />
              </div>
            </div>
            <div class="input-form">
              <label for="title">제목</label>
              <input
                id="title"
                v-model="form.title"
                type="text"
                name="title"
                placeholder="제목을 입력하세요"
                required
              >
            </div>
            <div class="input-form editor">
              <label for="textarea">내용</label>
              <ckeditor
                v-model="form.editorData"
                name="textarea"
                :editor="editor"
                :config="editorConfig"
              />
            </div>
            <div class="input-form-controls buttons">
              <b-button
                size="is-small"
                type="is-info"
                @click="writePost()"
              >
                <font-awesome-icon icon="pen" />&nbsp;
                <span>작성</span>
              </b-button>
              <b-button
                size="is-small"
                type="is-danger"
                @click="goBack()"
              >
                <font-awesome-icon icon="times" />&nbsp;
                <span>취소</span>
              </b-button>
            </div>
          </div>
        </form>
      </div>
    </main>
    <Footer />
  </div>
</template>

<script>
import Vue from 'vue'
import gql from 'graphql-tag'
import urljoin from 'url-join'
import pathParser from 'path-parse'
import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
import EssentialsPlugin from '@ckeditor/ckeditor5-essentials/src/essentials'
import BoldPlugin from '@ckeditor/ckeditor5-basic-styles/src/bold'
import ItalicPlugin from '@ckeditor/ckeditor5-basic-styles/src/italic'
import LinkPlugin from '@ckeditor/ckeditor5-link/src/link'
import ParagraphPlugin from '@ckeditor/ckeditor5-paragraph/src/paragraph'
import Heading from '@ckeditor/ckeditor5-heading/src/heading'
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment'
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote'
import Image from '@ckeditor/ckeditor5-image/src/image'
import ImageToolbar from '@ckeditor/ckeditor5-image/src/imagetoolbar'
import ImageCaption from '@ckeditor/ckeditor5-image/src/imagecaption'
import ImageStyle from '@ckeditor/ckeditor5-image/src/imagestyle'
import ImageResize from '@ckeditor/ckeditor5-image/src/imageresize'
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload'
import List from '@ckeditor/ckeditor5-list/src/list'
import Table from '@ckeditor/ckeditor5-table/src/table'
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar'
import { Navigation, Footer } from '@/components'
import { Post, SubCates, AllCates, CateInfo } from '@/assets/graphql/queries'
import { writePost, singleUpload } from '@/assets/graphql/mutations'

class ImageUploadToS3Adapter {
  constructor (loader) {
    this.loader = loader
  }

  upload () {
    return this.loader.file
      .then(file => new Promise((resolve, reject) => {
        Vue.prototype.$Apollo.mutate({
          mutation: gql`${singleUpload}`,
          variables: {
            file: file,
            type: "board"
          }
        }).then(({ data: { singleUpload } }) => {
          console.log(singleUpload)
          resolve({ default: singleUpload })
        }).catch(error => {
          reject(error)
        })
      }))
  }
}

const ImageUploadToS3AdapterPlugin = (editor) => {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    return new ImageUploadToS3Adapter(loader)
  }
}

export default {
  components: {
    Navigation,
    Footer
  },
  data () {
    return {
      depth1Deactivated: true,
      scrollBase: null,
      selectedCategory: '',
      selectedSubCategory: '',
      selectedCategoryTitle: '',
      selectedSubCategoryTitle: '',
      categories: [],
      category: '',
      category_idx: null,
      sub_categories: [],
      sub_category: '',
      sub_category_idx: null,
      editor: ClassicEditor,
      editorConfig: {
        language: 'ko',
        plugins: [
          EssentialsPlugin,
          BoldPlugin,
          ItalicPlugin,
          LinkPlugin,
          ParagraphPlugin,
          Heading,
          Alignment,
          BlockQuote,
          Image,
          ImageToolbar,
          ImageCaption,
          ImageStyle,
          ImageResize,
          ImageUpload,
          ImageUploadToS3AdapterPlugin,
          Table,
          TableToolbar,
          List
        ],
        toolbar: {
          items: [
            'heading',
            '|',
            'bold',
            'italic',
            'link',
            '|',
            'alignment',
            'bulletedList',
            'numberedList',
            'blockquote',
            '|',
            'insertTable',
            'mergeTableCells',
            'tableColumn',
            'tableRow',
            '|',
            'imageUpload'
          ]
        },
        heading: {
          options: [
            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' }
          ]
        },
        image: {
          toolbar: [
            'imageStyle:full',
            'imageStyle:side',
            '|',
            'imageTextAlternative'
          ]
        },
        simpleUpload: {
          uploadUrl: `http://${require('ip').address()}:455/graphql`
        }
      },
      title: '',
      form: {
        post: {},
        title: '',
        editorData: '<p></p>',
      },
    }
  },
  computed: {
    landingDescription () {
      return `${this.category} - ${this.sub_category}`
    }
  },
  watch: {
    selectedCategory (value) {
      if (value) {
        this.selectedCategoryTitle = this.categories.filter((elem) => elem.category_idx === value)[0].title
      }
    },
    selectedSubCategory (value) {
      if (value) {
        this.selectedSubCategoryTitle = this.sub_categories.filter((elem) => elem.category_idx === value)[0].title
      }
    }
  },
  beforeMount () {
    this.title = '게시물 작성'
    if (!this.$route.params.category) {
        this.$apollo.query({
            query: gql`${AllCates}`,
            variables: {
              depth: 0,
              category_type: "NORMAL"
            }
        }).then(({ data }) => {
            this.categories = data.boards
        }).catch(error => {
            console.error(error)
        })
    } else {
        this.$apollo.query({
            query: gql`${CateInfo}`,
            variables: {
            title: this.$route.params.category
            }
        }).then(({ data }) => {
            this.categories.push(data.boards[0].category_nm)
            this.selectedCategory = data.boards[0].category_idx
            this.category_idx = data.boards[0].category_idx
            this.selectedCategoryTitle = data.boards[0].category_nm
            this.category = data.boards[0].category_nm
            this.getCateDepth1()
        })
    }
  },
  methods: {
    writePost () {
      const user = this.$store.state.user
      if (this.selectedCategory && this.selectedSubCategory && this.form.title && this.form.editorData) {
        document.body.classList.toggle('loading')
        this.$apollo.mutate({
          mutation: gql`${writePost}`,
          variables: {
            category_idx: parseInt(this.selectedSubCategory),
            user_idx: user.idx,
            nick_nm: user.nick_nm,
            title: this.form.title,
            body: this.form.editorData,
            reg_ip: user.access_loc,
            reg_dt: Date.now(),
            upt_ip: user.access_loc
          }
        }).then(({ data: { writePost: { board_idx } } }) => {
          document.body.classList.toggle('loading')
          this.flash('게시되었습니다.', 'success')
          this.$router.push(`/board/${board_idx}/view`)
        })
      } else {
        this.$swal({
          title: '잠깐!',
          text: '작성하지 않은 항목이 있습니다.',
          type: 'error',
          footer: '<p class=\'has-text-centered\'>누락된 항목을 확인하신 후 다시 시도하여주시기 바랍니다.</p>',
          confirmButtonText: '확인'
        })
      }
    },
    goBack () {
      this.$router.go(-1)
    },
    getCateDepth1 () {
      this.sub_categories = []
      this.selectedSubCategory = ''
      this.$apollo.query({
        query: gql`${SubCates}`,
        variables: {
          depth: 1,
          parent: parseInt(this.selectedCategory)
        }
      }).then(({ data }) => {
        this.sub_categories = data.boards
        this.depth1Deactivated = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.v-select {
    margin-bottom: 5px;
}
</style>
