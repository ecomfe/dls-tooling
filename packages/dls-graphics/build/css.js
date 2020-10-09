import postcss from 'postcss'
import cssnano from 'cssnano'

export async function process (cssText, id) {
  return postcss([
    rewriteKeyframes({ id }),
    cssnano()
  ])
    .process(cssText, { from: undefined })
    .then(({ css }) => css).catch(error => {
      console.error(error)
    })
}

/**
 * Rewrite keyframes according to unique ids
 * Code mostly come from @vue/component-compiler-utils
 * See: https://github.com/vuejs/component-compiler-utils/blob/8b2c64618c47ea2dd3b38691286f825cbbcf9468/lib/stylePlugins/scoped.ts
 */
const keyframesStore = {}

const rewriteKeyframes = postcss.plugin('rewrite-keyframes', ({ id }) => {
  return (root) => {
    root.each((node) => {
      if (node.type === 'atrule') {
        if (/-?keyframes$/.test(node.name)) {
          if (!keyframesStore[id]) {
            keyframesStore[id] = {}
          }
          keyframesStore[id][node.params] = node.params = `${node.params}-${id}`
        }
      }
    })

    const keyframes = keyframesStore[id] || {}

    if (Object.keys(keyframes || {}).length) {
      root.walkDecls((decl) => {
        // individual animation-name declaration
        if (/^(-\w+-)?animation-name$/.test(decl.prop)) {
          decl.value = decl.value
            .split(',')
            .map((v) => keyframes[v.trim()] || v.trim())
            .join(',')
        }
        // shorthand
        if (/^(-\w+-)?animation$/.test(decl.prop)) {
          decl.value = decl.value
            .split(',')
            .map((v) => {
              const vals = v.trim().split(/\s+/)
              const i = vals.findIndex((val) => keyframes[val])
              if (i !== -1) {
                vals.splice(i, 1, keyframes[vals[i]])
                return vals.join(' ')
              } else {
                return v
              }
            })
            .join(',')
        }
      })
    }
  }
})
