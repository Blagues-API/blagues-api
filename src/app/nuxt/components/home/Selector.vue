<template>
  <div
    tabindex="0"
    class="selector"
    :class="{ active }"
    role="combobox"
    @focus="activate()"
    @blur="desactivate()"
    @keydown.self.down.prevent="pointerForward()"
    @keydown.self.up.prevent="pointerBackward()"
    @keypress.enter.self="addPointerElement()"
    @keyup.esc="desactivate()"
  >
    <div class="select_element">
      <div class="element">
        <img class="icon" :src="selected.icon" :alt="selected.name" />
        <span :style="{ color: selected.color }">{{ selected.name }}</span>
      </div>
      <DownIcon class="down" />
    </div>
    <div
      v-show="active"
      ref="list"
      :class="['select_elements', { 'top-pos': isTop }]"
      tabindex="-1"
      role="listbox"
      @focus="activate"
      @mousedown.prevent
    >
      <div
        v-for="(element, index) in elements"
        :key="element.id"
        class="element"
        :class="{ selected: index === pointer }"
        @click="select(element.id)"
        @mouseenter.self="pointer = index"
      >
        <img :src="element.icon" :alt="element.name" />
        <span :style="{ color: element.color }">{{ element.name }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import DownIcon from '@/assets/icons/down.svg?inline';

export default {
  name: 'Selector',
  components: {
    DownIcon
  },
  props: {
    value: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      active: false,
      isTop: false,
      pointer: 0,
      elements: [
        {
          id: 'npm',
          name: 'NPM',
          color: '#cb3837',
          icon: 'npm.svg'
        },
        {
          id: 'pypi',
          name: 'PYPI',
          color: '#3775a9',
          icon: 'pypi.svg'
        },
        {
          id: 'api',
          name: 'API',
          color: '#3f3f3f',
          icon: 'api.svg'
        }
      ]
    };
  },
  computed: {
    selected() {
      return this.elements.find((element) => element.id === this.value);
    },
    pointerPosition() {
      return this.pointer * 46;
    }
  },
  methods: {
    toggle() {
      this.active ? this.desactivate() : this.activate();
    },
    activate() {
      if (this.active || this.disabled) return;

      this.checkPosition();

      this.active = true;

      this.$el.focus();
    },
    desactivate() {
      if (!this.active) return;

      this.active = false;

      this.$el.blur();
    },
    pointerForward() {
      if (this.pointer < this.rolesElements.length - 1) {
        this.pointer++;

        if (
          this.$refs.list.scrollTop <=
          this.pointerPosition - (330 / 46 - 1) * 46
        ) {
          this.$refs.list.scrollTop =
            this.pointerPosition - (330 / 46 - 1) * 46;
        }
      }
    },
    pointerBackward() {
      if (this.pointer > 0) {
        this.pointer--;

        if (this.$refs.list.scrollTop >= this.pointerPosition) {
          this.$refs.list.scrollTop = this.pointerPosition;
        }
      }
    },
    addPointerElement() {
      if (this.rolesElements.length > 0) {
        this.add(this.rolesElements[this.pointer]);
      }
      this.pointer = 0;
    },
    checkPosition() {
      this.isTop =
        this.$refs.list.getBoundingClientRect().bottom > window.innerHeight;
    },
    select(element_id) {
      this.desactivate();
      this.$emit('input', element_id);
    }
  }
};
</script>

<style lang="scss">
.selector {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 46px;
  background-color: #ffffff;
  border: 1px solid #d7d7d7;
  border-radius: 3px;
  font-size: 15px;
  font-weight: 400;
  padding: 11px 12px 3px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.3s ease-out;
  user-select: none;
  .chip {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid;
    border-radius: 22px;
    height: 22px;
    text-overflow: ellipsis;
    font-size: 12px;
    font-weight: 600;
    margin: 0 8px 8px 0;
    padding: 4px;
    span {
      color: rgba(255, 255, 255, 0.8);
      font-weight: 200;
      margin-right: 5px;
      margin-left: 5px;
      line-height: 1;
    }
  }
  .select_element {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    .down {
      position: absolute;
      right: 16px;
    }
  }
  &.active .select_element .down {
    transform: rotate(180deg);
  }

  &:hover {
    border-color: #0098ff;
  }
  .select_elements {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 500;
    width: 100%;
    background-color: #ffffff;
    border-radius: 0 0 3px 3px;
    border: 1px solid #1a1a1a;
    box-sizing: border-box;
    max-height: 330px;
    overflow-y: auto;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.25);
    &.top-pos {
      top: unset;
      bottom: 100%;
    }

    &::-webkit-scrollbar {
      -webkit-appearance: none;
      background-color: #c4c4c4;
      border-radius: 5px;
      width: 10px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 5px;
      background-color: var(--primary);
      transition: background-color 0.1s ease;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: var(--primary);
    }
    .element {
      padding-left: 15px;
      cursor: pointer;
      min-height: 46px;
      font-weight: 500;
      display: flex;
      align-items: center;
      position: relative;
      &.hidden {
        display: none;
      }
      &.selected {
        background-color: #c4c4c4;
      }
    }
  }
}
</style>
