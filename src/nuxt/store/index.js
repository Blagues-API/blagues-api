export const state = () => ({
  doc: 'npm',
})

export const mutations = {
  SET_DOC(state, value) {
    state.doc = value
  },
}
