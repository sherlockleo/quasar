import Vue from 'vue'

import QIcon from '../icon/QIcon.js'
import QSpinner from '../spinner/QSpinner.js'

import BtnMixin from './btn-mixin.js'

import slot from '../../utils/slot.js'
import { stopAndPrevent } from '../../utils/event.js'

export default Vue.extend({
  name: 'QBtn',

  mixins: [ BtnMixin ],

  props: {
    percentage: Number,
    darkPercentage: Boolean
  },

  computed: {
    hasLabel () {
      return this.label !== void 0 && this.label !== null && this.label !== ''
    }
  },

  methods: {
    click (e) {
      if (this.pressed === true) { return }

      this.hasRouterLink === true && e !== void 0 && stopAndPrevent(e)

      const go = () => {
        this.$router[this.replace === true ? 'replace' : 'push'](this.to)
      }

      this.$emit('click', e, go)
      this.hasRouterLink === true && e.navigate !== false && go()

      if (e !== void 0 && e.qKeyEvent !== true && this.$refs.blurTarget !== void 0) {
        this.$refs.blurTarget.focus()
      }
    },

    __onKeydown (e) {
      if ([13, 32].includes(e.keyCode) === true) {
        stopAndPrevent(e)

        if (this.pressed !== true) {
          this.pressed = true
          this.$el.classList.add('q-btn--active')
          document.addEventListener('keyup', this.__onKeyupAbort)
        }
      }

      this.$emit('keydown', e)
    },

    __onKeyup (e) {
      if ([13, 32].includes(e.keyCode) === true) {
        // from form submit -- keydown was called
        // on other form item then keydown was attached to btn
        if (this.pressed !== true) {
          return
        }

        stopAndPrevent(e)
        this.__onKeyupAbort()

        // for ripple
        e.qKeyEvent = true

        // for click trigger
        const evt = new MouseEvent('click', e)
        evt.qKeyEvent = true
        this.$el.dispatchEvent(evt)
      }

      this.$emit('keyup', e)
    },

    __onKeyupAbort () {
      this.pressed = false
      document.removeEventListener('keyup', this.__onKeyupAbort)
      this.$el && this.$el.classList.remove('q-btn--active')
    }
  },

  beforeDestroy () {
    document.removeEventListener('keyup', this.__onKeyupAbort)
  },

  render (h) {
    const
      inner = [].concat(slot(this, 'default')),
      data = {
        staticClass: 'q-btn inline q-btn-item non-selectable',
        class: this.classes,
        style: this.style,
        attrs: this.attrs
      }

    if (this.isDisabled === false) {
      data.on = {
        ...this.$listeners,
        click: this.click,
        keydown: this.__onKeydown,
        keyup: this.__onKeyup
      }

      if (this.ripple !== false) {
        data.directives = [{
          name: 'ripple',
          value: this.ripple,
          modifiers: { center: this.isRound }
        }]
      }
    }

    if (this.hasLabel === true) {
      inner.unshift(
        h('div', [ this.label ])
      )
    }

    if (this.icon !== void 0) {
      inner.unshift(
        h(QIcon, {
          props: { name: this.icon, left: this.stack === false && this.hasLabel === true }
        })
      )
    }

    if (this.iconRight !== void 0 && this.isRound === false) {
      inner.push(
        h(QIcon, {
          props: { name: this.iconRight, right: this.stack === false && this.hasLabel === true }
        })
      )
    }

    return h(this.isLink ? 'a' : 'button', data, [
      h('div', {
        staticClass: 'q-focus-helper',
        ref: 'blurTarget',
        attrs: { tabindex: -1 }
      }),

      this.loading === true && this.percentage !== void 0
        ? h('div', {
          staticClass: 'q-btn__progress absolute-full',
          class: this.darkPercentage ? 'q-btn__progress--dark' : null,
          style: { transform: `scale3d(${this.percentage / 100},1,1)` }
        })
        : null,

      h('div', {
        staticClass: 'q-btn__content text-center col items-center q-anchor--skip',
        class: this.innerClasses
      }, inner),

      this.loading !== null
        ? h('transition', {
          props: { name: 'q-transition--fade' }
        }, this.loading === true ? [
          h('div', {
            key: 'loading',
            staticClass: 'absolute-full flex flex-center'
          }, this.$scopedSlots.loading !== void 0 ? this.$scopedSlots.loading() : [ h(QSpinner) ])
        ] : void 0)
        : null
    ])
  }
})
