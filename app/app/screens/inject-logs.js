/**
 * inject-logs.js
 *
 * Injects console.log calls at:
 *  - Top of GenerateCard
 *  - Every useEffect / useMemo
 *  - Every onPress, onChangeText, onUpdate, onStart handler
 */
module.exports = function(file, { jscodeshift: j }) {
    const root = j(file.source);
  
    // 1) At start of GenerateCard
    root.find(j.VariableDeclarator, { id: { name: 'GenerateCard' } })
      .find(j.ArrowFunctionExpression)
      .forEach(path => {
        path.get('body','body').unshift(
          j.expressionStatement(
            j.callExpression(j.memberExpression(j.identifier('console'), j.identifier('log')), [
              j.literal('🎬 Render GenerateCard')
            ])
          )
        );
      });
  
    // 2) In every useEffect / useMemo
    ['useEffect','useMemo'].forEach(hook => {
      root.find(j.CallExpression, { callee: { name: hook } })
        .forEach(path => {
          const cb = path.node.arguments[0];
          if ((cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression') &&
              cb.body.type === 'BlockStatement') {
            cb.body.body.unshift(
              j.expressionStatement(
                j.callExpression(j.memberExpression(j.identifier('console'), j.identifier('log')), [
                  j.literal(`🔧 [${hook}] running`)
                ])
              )
            );
          }
        });
    });
  
    // 3) In every onPress / onChangeText / onUpdate / onStart handler
    root.find(j.ObjectExpression).forEach(obj => {
      obj.node.properties.forEach(prop => {
        if (
          prop.key.type === 'Identifier' &&
          /^(onPress|onChangeText|onUpdate|onStart)$/.test(prop.key.name) &&
          (prop.value.type === 'ArrowFunctionExpression' || prop.value.type === 'FunctionExpression')
        ) {
          prop.value.body.body.unshift(
            j.expressionStatement(
              j.callExpression(j.memberExpression(j.identifier('console'), j.identifier('log')), [
                j.literal(`🔔 Handler ${prop.key.name} fired`)
              ])
            )
          );
        }
      });
    });
  
    return root.toSource({ quote: 'single' });
  };
  