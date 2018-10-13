import Vue from 'vue'
import App from './App'
import Vuetify from 'vuetify' 
import 'vuetify/dist/vuetify.min.css'
import JQuery from 'jquery'
import * as _ from 'lodash'
// import 'core-js';
// import '@babel/polyfill'
window.$ = JQuery
window._ = _

Vue.use(Vuetify)

/* eslint-disable no-new */
new Vue({
  el: '#app',
  
  
  render: h => h(App)
})
