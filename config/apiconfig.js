module.exports = {
  contentType: 'application/json',
  acceptedContentTypes: ['application/json', 'text/html'], // We accept application/json and text/html as stringified JSON is "text", sort of.
  cachePrivate: 'private,no-store,no-cache,must-revalidate,max-age=0',
  cachePublicShort: 'public, max-age=7884000', // For three months
  cachePublicLong: 'public, max-age=31557600', // For a year.
  contentTypeOptions: 'nosniff'
}
