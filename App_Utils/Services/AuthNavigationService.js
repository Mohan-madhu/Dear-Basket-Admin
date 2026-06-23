export const resetToLogin = (navigation) => {
  let rootNavigation = navigation;

  while (rootNavigation?.getParent?.()) {
    rootNavigation = rootNavigation.getParent();
  }

  rootNavigation?.reset({
    index: 0,
    routes: [{ name: "Login" }],
  });
};
