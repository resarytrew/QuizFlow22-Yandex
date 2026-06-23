(function () {
  var legalOrigin = 'https://mykviz.ru';
  var legalPaths = {
    '/legal/public-offer.html': true,
    '/legal/privacy-policy.html': true,
    '/legal/project-rules.html': true
  };
  var path = window.location.pathname.replace(/\/+$/, '');

  if (!legalPaths[path]) return;

  window.location.replace(
    legalOrigin + path + window.location.search + window.location.hash
  );
}());
