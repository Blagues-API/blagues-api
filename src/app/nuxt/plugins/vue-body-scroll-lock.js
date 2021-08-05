import Vue from 'vue'

import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock'

const RESERVE_SCROLL_BAR_GAP = 'reserve-scroll-bar-gap'
const options = {
  reserveScrollBarGap: true,
}

Vue.directive('body-scroll-lock', {
  inserted: (el, binding) => {
    if (
      binding.arg &&
      binding.arg === RESERVE_SCROLL_BAR_GAP &&
      binding.value
    ) {
      disableBodyScroll(el, options)
    } else if (binding.value) {
      disableBodyScroll(el)
    }
  },
  componentUpdated: (el, binding) => {
    if (binding.oldValue === binding.value) {
      return
    }

    if (
      binding.arg &&
      binding.arg === RESERVE_SCROLL_BAR_GAP &&
      binding.value
    ) {
      disableBodyScroll(el, options)
    } else if (binding.value) {
      disableBodyScroll(el)
    } else {
      enableBodyScroll(el)
    }
  },
  unbind: (el) => {
    enableBodyScroll(el)
  },
})
