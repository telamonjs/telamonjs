import ora, { type Ora } from 'ora'

export const spinner = {
  start: (text: string) => {
    return ora({
      text,
      color: 'blue',
    }).start()
  },

  succeed: (spinner: Ora, text: string) => {
    spinner.succeed(text)
  },

  fail: (spinner: Ora, text: string) => {
    spinner.fail(text)
  },

  info: (spinner: Ora, text: string) => {
    spinner.info(text)
  },
}
