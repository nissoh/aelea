// import * as http from 'http'
// import * as url from 'url'

// const port = 4000
// http.createServer(function (proxyReq, proxyResp) {
//   const params = url.parse(proxyReq.url as string, true)
//   const imgURL = params.query.src

//   const destParams = url.parse(imgURL)

//   const reqOptions = {
//     host: destParams.host,
//     port: 80,
//     path: destParams.path,
//     method: 'GET'
//   }

//   const req = http.request(reqOptions, function (res) {
//     const headers = res.headers
//     headers['Access-Control-Allow-Origin'] = '*'
//     headers['Access-Control-Allow-Headers'] = 'X-Requested-With'
//     proxyResp.writeHead(200, headers)

//     res.on('data', function (chunk) {
//       proxyResp.write(chunk)
//     })

//     res.on('end', function () {
//       proxyResp.end()
//     })
//   })

//   req.on('error', function (e) {
//     console.log('problem with request: ' + e.message)
//     proxyResp.writeHead(503)
//     proxyResp.write('An error happened!')
//     proxyResp.end()
//   })
//   req.end()

// }).listen(port)
