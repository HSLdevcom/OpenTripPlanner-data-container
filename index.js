const { postSlackMessage } = require('./util')
const { update } = require('./task/Update')

postSlackMessage('Starting data build').then(response => {
  if (response.ok) {
    global.messageTimeStamp = response.ts
  }
}).catch((err) => {
  console.log(err)
}).finally(() => {
  update()
})
