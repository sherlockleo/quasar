import Vue from 'vue'

import QField from '../field/QField.js'
import QIcon from '../icon/QIcon.js'
import QChip from '../chip/QChip.js'

import QItem from '../list/QItem.js'
import QItemSection from '../list/QItemSection.js'
import QItemLabel from '../list/QItemLabel.js'

import QMenu from '../menu/QMenu.js'
import QDialog from '../dialog/QDialog.js'

import slot from '../../utils/slot.js'
import { isDeepEqual } from '../../utils/is.js'
import { stop, prevent, stopAndPrevent } from '../../utils/event.js'
import { normalizeToInterval } from '../../utils/format.js'

const validateNewValueMode = v => ['add', 'add-unique', 'toggle'].includes(v)

export default Vue.extend({
  name: 'QSelect',

  mixins: [ QField ],

  props: {
    value: {
      required: true
    },

    multiple: Boolean,

    displayValue: [String, Number],
    displayValueSanitize: Boolean,
    dropdownIcon: String,

    options: {
      type: Array,
      default: () => []
    },

    optionValue: [Function, String],
    optionLabel: [Function, String],
    optionDisable: [Function, String],

    hideSelected: Boolean,
    hideDropdownIcon: Boolean,

    maxValues: [Number, String],

    optionsDense: Boolean,
    optionsDark: Boolean,
    optionsSelectedClass: String,
    optionsCover: Boolean,
    optionsSanitize: Boolean,

    useInput: Boolean,
    useChips: Boolean,

    newValueMode: {
      type: String,
      validator: validateNewValueMode
    },

    mapOptions: Boolean,
    emitValue: Boolean,

    inputDebounce: {
      type: [Number, String],
      default: 500
    },

    transitionShow: {
      type: String,
      default: 'fade'
    },

    transitionHide: {
      type: String,
      default: 'fade'
    },

    autofocus: Boolean
  },

  data () {
    return {
      menu: false,
      dialog: false,
      optionIndex: -1,
      optionsToShow: 20,
      inputValue: ''
    }
  },

  watch: {
    selectedString: {
      handler (val) {
        const value = this.multiple !== true && this.hideSelected === true
          ? val
          : ''

        if (this.inputValue !== value) {
          this.inputValue = value
        }
      },
      immediate: true
    },

    menu (show) {
      this.__updateMenu(show)
    }
  },

  computed: {
    fieldClass () {
      return `q-select q-field--auto-height q-select--with${this.useInput !== true ? 'out' : ''}-input`
    },

    innerValue () {
      const
        mapNull = this.mapOptions === true && this.multiple !== true,
        val = this.value !== void 0 && (this.value !== null || mapNull === true)
          ? (this.multiple === true ? this.value : [ this.value ])
          : []

      return this.mapOptions === true && Array.isArray(this.options) === true
        ? (
          this.value === null && mapNull === true
            ? val.map(v => this.__getOption(v)).filter(v => v !== null)
            : val.map(v => this.__getOption(v))
        )
        : val
    },

    noOptions () {
      return this.options === void 0 || this.options === null || this.options.length === 0
    },

    selectedString () {
      return this.innerValue
        .map(opt => this.__getOptionLabel(opt))
        .join(', ')
    },

    displayAsText () {
      return this.displayValueSanitize === true || (
        this.displayValue === void 0 && (
          this.optionsSanitize === true ||
          this.innerValue.some(opt => opt.sanitize === true)
        )
      )
    },

    selectedScope () {
      const tabindex = this.focused === true ? 0 : -1

      return this.innerValue.map((opt, i) => ({
        index: i,
        opt,
        sanitize: this.optionsSanitize === true || opt.sanitize === true,
        selected: true,
        removeAtIndex: this.removeAtIndex,
        toggleOption: this.toggleOption,
        tabindex
      }))
    },

    computedCounter () {
      if (this.multiple === true && this.counter === true) {
        return (this.value !== void 0 && this.value !== null ? this.value.length : '0') +
          (this.maxValues !== void 0 ? ' / ' + this.maxValues : '')
      }
    },

    optionScope () {
      return this.options.slice(0, this.optionsToShow).map((opt, i) => {
        const disable = this.__isDisabled(opt)

        const itemProps = {
          clickable: true,
          active: false,
          activeClass: this.optionsSelectedClass,
          manualFocus: true,
          focused: false,
          disable,
          tabindex: -1,
          dense: this.optionsDense,
          dark: this.optionsDark
        }

        if (disable !== true) {
          this.__isSelected(opt) === true && (itemProps.active = true)
          this.optionIndex === i && (itemProps.focused = true)
        }

        const itemEvents = {
          click: () => { this.toggleOption(opt) }
        }

        if (this.$q.platform.is.desktop === true) {
          itemEvents.mousemove = () => { this.setOptionIndex(i) }
        }

        return {
          index: i,
          opt,
          sanitize: this.optionsSanitize === true || opt.sanitize === true,
          selected: itemProps.active,
          focused: itemProps.focused,
          toggleOption: this.toggleOption,
          setOptionIndex: this.setOptionIndex,
          itemProps,
          itemEvents
        }
      })
    },

    dropdownArrowIcon () {
      return this.dropdownIcon !== void 0
        ? this.dropdownIcon
        : this.$q.iconSet.arrow.dropdown
    },

    squaredMenu () {
      return this.optionsCover === false &&
        this.outlined !== true &&
        this.standout !== true &&
        this.borderless !== true &&
        this.rounded !== true
    }
  },

  methods: {
    removeAtIndex (index) {
      if (index > -1 && index < this.innerValue.length) {
        if (this.multiple === true) {
          const model = [].concat(this.value)
          this.$emit('remove', { index, value: model.splice(index, 1) })
          this.$emit('input', model)
        }
        else {
          this.$emit('input', null)
        }
      }
    },

    add (opt, unique) {
      const val = this.emitValue === true
        ? this.__getOptionValue(opt)
        : opt

      if (this.multiple !== true) {
        this.$emit('input', val)
        return
      }

      if (this.innerValue.length === 0) {
        this.$emit('add', { index: 0, value: val })
        this.$emit('input', this.multiple === true ? [ val ] : val)
        return
      }

      if (unique === true && this.__isSelected(opt) === true) {
        return
      }

      const model = [].concat(this.value)

      if (this.maxValues !== void 0 && model.length >= this.maxValues) {
        return
      }

      this.$emit('add', { index: model.length, value: val })
      model.push(val)
      this.$emit('input', model)
    },

    toggleOption (opt) {
      if (this.editable !== true || opt === void 0 || this.__isDisabled(opt) === true) { return }

      this.focus()

      const optValue = this.__getOptionValue(opt)

      if (this.multiple !== true) {
        this.__closePopup()

        if (isDeepEqual(this.__getOptionValue(this.value), optValue) !== true) {
          this.$emit('input', this.emitValue === true ? optValue : opt)
        }
        else {
          const val = this.__getOptionLabel(opt)
          if (val !== this.inputValue) {
            this.inputValue = val
          }
        }

        return
      }

      if (this.innerValue.length === 0) {
        const val = this.emitValue === true ? optValue : opt
        this.$emit('add', { index: 0, value: val })
        this.$emit('input', this.multiple === true ? [ val ] : val)
        return
      }

      const
        model = [].concat(this.value),
        index = this.value.findIndex(v => isDeepEqual(this.__getOptionValue(v), optValue))

      if (index > -1) {
        this.$emit('remove', { index, value: model.splice(index, 1) })
      }
      else {
        if (this.maxValues !== void 0 && model.length >= this.maxValues) {
          return
        }

        const val = this.emitValue === true ? optValue : opt

        this.$emit('add', { index: model.length, value: val })
        model.push(val)
      }

      this.$emit('input', model)
    },

    setOptionIndex (index) {
      if (this.$q.platform.is.desktop !== true) { return }

      const val = index >= -1 && index < this.optionsToShow
        ? index
        : -1

      if (this.optionIndex !== val) {
        this.optionIndex = val
      }
    },

    __getOption (value) {
      return this.options.find(opt => isDeepEqual(this.__getOptionValue(opt), value)) || value
    },

    __getOptionValue (opt) {
      if (typeof this.optionValue === 'function') {
        return this.optionValue(opt)
      }
      if (Object(opt) === opt) {
        return typeof this.optionValue === 'string'
          ? opt[this.optionValue]
          : opt.value
      }
      return opt
    },

    __getOptionLabel (opt) {
      if (typeof this.optionLabel === 'function') {
        return this.optionLabel(opt)
      }
      if (Object(opt) === opt) {
        return typeof this.optionLabel === 'string'
          ? opt[this.optionLabel]
          : opt.label
      }
      return opt
    },

    __isDisabled (opt) {
      if (typeof this.optionDisable === 'function') {
        return this.optionDisable(opt) === true
      }
      if (Object(opt) === opt) {
        return typeof this.optionDisable === 'string'
          ? opt[this.optionDisable] === true
          : opt.disable === true
      }
      return false
    },

    __isSelected (opt) {
      const val = this.__getOptionValue(opt)
      return this.innerValue.find(v => isDeepEqual(this.__getOptionValue(v), val)) !== void 0
    },

    __onTargetKeydown (e) {
      // escape
      if (e.keyCode === 27) {
        this.__closeMenu()
        return
      }

      if (this.innerLoading !== true && this.menu === false && e.keyCode === 40) { // down
        stopAndPrevent(e)

        if (this.$listeners.filter !== void 0) {
          this.filter(this.inputValue)
        }
        else {
          this.menu = true
        }

        return
      }

      if (this.multiple === true && this.inputValue.length === 0 && e.keyCode === 8) { // delete
        this.removeAtIndex(this.value.length - 1)
        return
      }

      // enter
      if (e.target !== this.$refs.target || e.keyCode !== 13) { return }

      stopAndPrevent(e)

      if (this.optionIndex > -1 && this.optionIndex < this.optionsToShow) {
        this.toggleOption(this.options[this.optionIndex])

        if (this.multiple === true && this.inputValue.length > 0) {
          if (this.$listeners.filter !== void 0) {
            this.filter('')
            this.optionIndex = -1
          }
          else {
            this.inputValue = ''
          }
        }
        return
      }

      if (this.inputValue.length > 0) {
        if (this.newValueMode !== void 0 || this.$listeners['new-value'] !== void 0) {
          const done = (val, mode) => {
            if (mode) {
              if (validateNewValueMode(mode) !== true) {
                console.error('QSelect: invalid new value mode - ' + mode)
                return
              }
            }
            else {
              mode = this.newValueMode
            }

            if (val !== void 0 && val !== null) {
              this[mode === 'toggle' ? 'toggleOption' : 'add'](
                val,
                mode === 'add-unique'
              )
            }

            this.inputValue = ''
          }

          if (this.$listeners['new-value'] !== void 0) {
            this.$emit('new-value', this.inputValue, done)
          }
          else {
            done(this.inputValue)
          }
        }
      }

      if (this.menu === true) {
        this.__closeMenu()
      }
      else if (this.innerLoading !== true) {
        if (this.$listeners.filter !== void 0) {
          this.filter(this.inputValue)
        }
        else {
          this.menu = true
        }
      }
    },

    __onGlobalKeydown (e) {
      // escape
      if (e.keyCode === 27) {
        this.__closeMenu()
        return
      }

      // up, down
      if (e.keyCode === 38 || e.keyCode === 40) {
        stopAndPrevent(e)

        if (this.menu === true) {
          let index = this.optionIndex
          do {
            index = normalizeToInterval(
              index + (e.keyCode === 38 ? -1 : 1),
              -1,
              Math.min(this.optionsToShow, this.options.length) - 1
            )

            if (index === -1) {
              this.optionIndex = -1
              return
            }
          }
          while (index !== this.optionIndex && this.__isDisabled(this.options[index]) === true)

          const dir = index > this.optionIndex ? 1 : -1
          this.optionIndex = index

          this.$nextTick(() => {
            const el = this.__getMenuContentEl().querySelector('.q-manual-focusable--focused')
            if (el !== null && el.scrollIntoView !== void 0) {
              if (el.scrollIntoViewIfNeeded !== void 0) {
                el.scrollIntoViewIfNeeded(false)
              }
              else {
                el.scrollIntoView(dir === -1)
              }
            }
          })
        }
      }
    },

    __getMenuContentEl () {
      return this.hasDialog === true
        ? this.$refs.menuContent
        : (
          this.$refs.menu !== void 0
            ? this.$refs.menu.__portal.$el
            : void 0
        )
    },

    __hydrateOptions (updatePosition) {
      if (this.avoidScroll !== true) {
        if (this.optionsToShow < this.options.length) {
          const el = this.__getMenuContentEl()

          if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
            this.optionsToShow += 20
            this.avoidScroll = true
            this.$nextTick(() => {
              this.avoidScroll = false
              this.__hydrateOptions(updatePosition)
            })

            return
          }
        }

        updatePosition === true && this.__updateMenuPosition()
      }
    },

    __getSelection (h, fromDialog) {
      if (this.hideSelected === true) {
        return fromDialog !== true && this.hasDialog === true
          ? [
            h('span', {
              domProps: {
                'textContent': this.inputValue
              }
            })
          ]
          : []
      }

      if (this.$scopedSlots['selected-item'] !== void 0) {
        return this.selectedScope.map(scope => this.$scopedSlots['selected-item'](scope))
      }

      if (this.$scopedSlots.selected !== void 0) {
        return this.$scopedSlots.selected()
      }

      if (this.useChips === true) {
        const tabindex = this.focused === true ? 0 : -1

        return this.selectedScope.map((scope, i) => h(QChip, {
          key: 'option-' + i,
          props: {
            removable: this.__isDisabled(scope.opt) !== true,
            dense: true,
            textColor: this.color,
            tabindex
          },
          on: {
            remove () { scope.removeAtIndex(i) }
          }
        }, [
          h('span', {
            domProps: {
              [scope.sanitize === true ? 'textContent' : 'innerHTML']: this.__getOptionLabel(scope.opt)
            }
          })
        ]))
      }

      return [
        h('span', {
          domProps: {
            [this.displayAsText ? 'textContent' : 'innerHTML']: this.displayValue !== void 0
              ? this.displayValue
              : this.selectedString
          }
        })
      ]
    },

    __getControl (h, fromDialog) {
      let data = {}
      const child = this.__getSelection(h, fromDialog)

      if (this.useInput === true && (fromDialog === true || this.hasDialog === false)) {
        child.push(this.__getInput(h))
      }
      else if (this.editable === true) {
        data = {
          ref: 'target',
          attrs: {
            tabindex: 0,
            ...this.$attrs
          },
          on: {
            keydown: this.__onTargetKeydown
          }
        }
      }

      data.staticClass = 'q-field__native row items-center'

      return h('div', data, child)
    },

    __getOptions (h) {
      const fn = this.$scopedSlots.option || (scope => h(QItem, {
        key: scope.index,
        props: scope.itemProps,
        on: scope.itemEvents
      }, [
        h(QItemSection, [
          h(QItemLabel, {
            domProps: {
              [scope.sanitize === true ? 'textContent' : 'innerHTML']: this.__getOptionLabel(scope.opt)
            }
          })
        ])
      ]))

      return this.optionScope.map(fn)
    },

    __getInnerAppend (h) {
      return this.hideDropdownIcon !== true
        ? [
          h(QIcon, {
            staticClass: 'q-select__dropdown-icon',
            props: { name: this.dropdownArrowIcon }
          })
        ]
        : null
    },

    __getInput (h) {
      return h('input', {
        ref: 'target',
        staticClass: 'q-select__input col',
        class: this.hideSelected !== true && this.innerValue.length > 0
          ? 'q-select__input--padding'
          : null,
        domProps: { value: this.inputValue },
        attrs: {
          tabindex: 0,
          ...this.$attrs,
          disabled: this.editable !== true
        },
        on: {
          input: this.__onInputValue,
          keydown: this.__onTargetKeydown
        }
      })
    },

    __onInputValue (e) {
      clearTimeout(this.inputTimer)
      this.inputValue = e.target.value || ''

      if (this.optionIndex !== -1) {
        this.optionIndex = -1
      }

      if (this.$listeners.filter !== void 0) {
        this.inputTimer = setTimeout(() => {
          this.filter(this.inputValue)
        }, this.inputDebounce)
      }
    },

    filter (val) {
      this.inputValue = val

      if (this.innerLoading === true) {
        this.$emit('filter-abort')
      }
      else {
        this.innerLoading = true
      }

      const filterId = setTimeout(() => {
        this.menu === true && (this.menu = false)
      }, 10)
      clearTimeout(this.filterId)
      this.filterId = filterId

      this.$emit(
        'filter',
        val,
        fn => {
          if (this.focused === true && this.filterId === filterId) {
            clearTimeout(this.filterId)
            typeof fn === 'function' && fn()
            this.$nextTick(() => {
              this.innerLoading = false
              if (this.menu === true) {
                this.__updateMenu(true)
              }
              else {
                this.menu = true
              }
            })
          }
        },
        () => {
          if (this.focused === true && this.filterId === filterId) {
            clearTimeout(this.filterId)
            this.innerLoading = false
          }
          this.menu === true && (this.menu = false)
        }
      )
    },

    __getControlEvents () {
      return this.hasDialog === true
        ? {
          click: e => {
            this.focused = true
            this.dialog = true

            this.$emit('focus', e)

            if (this.$listeners.filter !== void 0) {
              this.filter(this.inputValue)
            }
            else if (this.noOptions !== true || this.$scopedSlots['no-option'] !== void 0) {
              this.menu = true
            }
          }
        }
        : {
          focus: this.focus,
          click: () => {
            if (this.menu === true) {
              this.__closeMenu()
            }
            else {
              if (this.$listeners.filter !== void 0) {
                this.filter(this.inputValue)
              }
              else if (this.noOptions !== true || this.$scopedSlots['no-option'] !== void 0) {
                this.menu = true
              }
            }
          },
          focusin: this.__onControlFocusin,
          focusout: this.__onControlFocusout
        }
    },

    __hasInnerFocus () {
      let menu

      return (
        document.hasFocus() === true &&
        this.$refs !== void 0 && (
          (this.$refs.control !== void 0 && this.$refs.control.contains(document.activeElement) !== false) ||
          ((menu = this.__getMenuContentEl()) !== void 0 && menu.contains(document.activeElement) !== false)
        )
      )
    },

    __onControlFocusin (e) {
      if (this.editable !== true) {
        return
      }

      if (this.__hasInnerFocus() === false) {
        return
      }

      this.focused = true
      this.$emit('focus', e)

      const target = this.$refs.target
      if (target !== void 0 && this.useInput === true && this.inputValue.length > 0) {
        target.setSelectionRange(0, this.inputValue.length)
      }
    },

    __onControlFocusout (e) {
      setTimeout(() => {
        clearTimeout(this.inputTimer)

        if (this.__hasInnerFocus() === true) {
          return
        }

        if (this.focused === true) {
          this.focused = false
          this.$emit('blur', e)
        }

        const val = this.multiple !== true && this.hideSelected === true
          ? this.selectedString
          : ''

        if (this.inputValue !== val) {
          this.inputValue = val
        }

        this.__closeMenu()
      }, 100)
    },

    __getPopup (h) {
      if (
        this.editable !== false && (
          this.dialog === true || // dialog always has menu displayed, so need to render it
          this.noOptions !== true ||
          this.$scopedSlots['no-option'] !== void 0
        )
      ) {
        return this[`__get${this.hasDialog === true ? 'Dialog' : 'Menu'}`](h)
      }
    },

    __getMenu (h) {
      return h(QMenu, {
        ref: 'menu',
        props: {
          value: this.menu,
          fit: true,
          cover: this.optionsCover === true && this.noOptions !== true && this.useInput !== true,
          noParentEvent: true,
          noRefocus: true,
          noFocus: true,
          square: this.squaredMenu,
          transitionShow: this.transitionShow,
          transitionHide: this.transitionHide
        },
        on: {
          '&scroll': this.__hydrateOptions,
          'before-show': e => {
            this.$nextTick(() => {
              this.__onControlFocusin(e)
            })
          },
          hide: e => {
            this.__closeMenu()
            this.__onControlFocusout(e)
          }
        }
      }, this.noOptions === true ? slot(this, 'no-option') : this.__getOptions(h))
    },

    __getDialog (h) {
      const content = [
        h(QField, {
          staticClass: 'col-auto',
          props: {
            ...this.$props,
            dark: this.optionsDark,
            square: true,
            loading: this.innerLoading,
            filled: true
          },
          on: {
            ...this.$listeners,
            focus: stop,
            blur: stop
          },
          scopedSlots: {
            ...this.$scopedSlots,
            control: () => this.__getControl(h, true),
            before: void 0,
            after: void 0
          }
        })
      ]

      this.menu === true && content.push(
        h('div', {
          ref: 'menuContent',
          staticClass: 'scroll' + (this.optionsDark === true ? ' q-select__menu--dark' : ''),
          on: {
            click: prevent,
            '&scroll': this.__hydrateOptions
          }
        }, this.noOptions === true ? slot(this, 'no-option') : this.__getOptions(h))
      )

      return h(QDialog, {
        props: {
          value: this.dialog,
          noRefocus: true,
          noFocus: true,
          position: this.useInput === true ? 'top' : void 0
        },
        on: {
          'before-hide': () => {
            this.focused = false
          },
          hide: e => {
            this.__closePopup()
            this.$emit('blur', e)
          },
          show: () => {
            this.$refs.target.focus()
          }
        }
      }, [
        h('div', {
          staticClass: 'q-select__dialog' + (this.optionsDark === true ? ' q-select__menu--dark' : '')
        }, content)
      ])
    },

    __closeMenu () {
      this.menu = false

      clearTimeout(this.filterId)
      this.filterId = void 0

      if (this.innerLoading === true) {
        this.$emit('filter-abort')
        this.innerLoading = false
      }
    },

    __closePopup () {
      this.dialog = false
      this.__closeMenu()
    },

    __updateMenu (show) {
      this.optionIndex = -1
      if (show === true) {
        this.optionsToShow = 20
        this.$nextTick(() => {
          this.__hydrateOptions(true)
        })
      }

      if (this.$q.platform.is.desktop === true) {
        const action = (show === true ? 'add' : 'remove') + 'EventListener'
        document.body[action]('keydown', this.__onGlobalKeydown)
      }
    },

    __updateMenuPosition () {
      if (this.dialog === false && this.$refs.menu !== void 0) {
        this.$refs.menu.updatePosition()
      }
    },

    __onPreRender () {
      this.hasDialog = this.$q.platform.is.mobile !== true
        ? false
        : (
          this.$listeners['new-value'] !== void 0
            ? this.$listeners.filter !== void 0
            : true
        )
    },

    __onPostRender () {
      this.__updateMenuPosition()
    }
  },

  mounted () {
    this.autofocus === true && this.$nextTick(this.focus)
  },

  beforeDestroy () {
    clearTimeout(this.inputTimer)
    document.body.removeEventListener('keydown', this.__onGlobalKeydown)
  }
})
