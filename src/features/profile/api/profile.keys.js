export const profileKeys = {
  all: ['profile'],
  me: () => [...profileKeys.all, 'me'],
}
