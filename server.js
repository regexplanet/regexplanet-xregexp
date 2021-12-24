var fs = require("fs");
var http = require("http");
var os = require("os");
var querystring = require('querystring');
var util = require("util");
var url = require("url");
var XRegExp = require('./xregexp-all.js');

function h(unsafe)
{
	if (unsafe == null)
	{
		return "";
	}

	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}


function getStatus()
{
	var retVal = {}

	retVal["success"] = true;
	retVal["version"] = XRegExp.version;
    retVal["timestamp"] = new Date().toISOString();
    retVal["lastmod"] = process.env['LASTMOD'] || '(not set)';
    retVal["commit"] = process.env['COMMIT'] || '(not set)';
    retVal["tech"] = "NodeJS " + process.version;
	retVal["__filename"] = __filename;
	retVal["os.hostname"] = os.hostname();
	retVal["os.type"] = os.type();
	retVal["os.platform"] = os.platform();
	retVal["os.arch"] = os.arch();
	retVal["os.release"] = os.release();
	/*retVal["os.uptime"] = os.uptime();
	retVal["os.loadavg"] = os.loadavg();
	retVal["os.totalmem"] = os.totalmem();
	retVal["os.freemem"] = os.freemem();
	retVal["os.cpus.length"] = os.cpus().length;
	retVal["os.networkInterfaces"] = os.networkInterfaces();*/
	/*
	retVal["process.arch"] = process.arch;
	retVal["process.cwd"] = process.cwd();
	retVal["process.execPath"] = process.execPath;
	retVal["process.memoryUsage"] = process.memoryUsage();
	retVal["process.platform"] = process.platform;
	retVal["process.uptime"] = process.uptime();
	retVal["process.version"] = process.versions;
	retVal["process.versions"] = process.versions;
	retVal["process.installPrefix"] = process.installPrefix;
	*/
	return retVal;
}

function parseParams(query)
{
	var params = {};
	if (query != null && query.length > 0)
	{
		var pairs = query.split("&");
		for (var loop = 0; loop < pairs.length; loop++)
		{
			var kv = pairs[loop].split('=');
			if (kv && kv.length == 2)
			{
				if (kv[0] in params)
				{
					params[kv[0]].push(querystring.unescape(kv[1].replace(/\+/g, " ")));
				}
				else
				{
					params[kv[0]] = [ querystring.unescape(kv[1].replace(/\+/g, " ")) ];
				}
			}
			else
			{
				//LATER: do something?
			}
		}
	}

	return params;
}


function redirect(response, location)
{
	response.writeHead(302, {"Content-Type": "text/plain", "Location" : location});
	response.write("Redirecting to " + location);
	response.end();
}

function serveFile(response, contentType, fileName)
{
	var stream = fs.createReadStream(fileName);

	response.writeHead(200, contentType);

	stream.pipe(response);

	stream.on('error', function (err)
		{
			//LATER
		});

	stream.on('end', function ()
		{
			response.statusCode = 200;
			response.end();
		});
}

function serveStatus(query, response)
{
	response.writeHead(200, {
			"Content-Type": "text/plain",
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, GET',
			'Access-Control-Max-Age': '604800',
		});

	var params = parseParams(query);

	if ('callback' in params)
	{
		response.write(params['callback'][0]);
		response.write("(");
		response.write(JSON.stringify(getStatus()));
		response.write(")");
	}
	else
	{
		response.write(JSON.stringify(getStatus()));
	}
	response.end();
}

function serveTestPost(request, response)
{
	var data = "";

    request.on("data", function(chunk)
    	{
    		data += chunk;
    	});

    request.on("end", function()
    	{
    		serveTest(data, response);
    	});
}

function serveTest(query, response)
{
	response.writeHead(200, {
			"Content-Type": "text/plain",
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, GET',
			'Access-Control-Max-Age': '604800',
		});

	if (query == null || query.length == 0)
	{
		response.write(JSON.stringify({"success": false, "message": "no input"}));
		response.end();
		return;
	}

	var retVal = {};

	retVal["success"] = true;
	retVal["message"] = "OK";
	retVal["query"] = query;

	try
	{
		var params = parseParams(query);

		retVal["params"] = JSON.stringify(params);

		var str_regex = 'regex' in params ? params['regex'][0] : null;
		if (str_regex == null || str_regex.length == 0)
		{
			response.write(JSON.stringify({"success": false, "message": "No regex to test!"}));
			response.end();
			return;
		}

		var replacement = 'replacement' in params ? params['replacement'][0] : null;
		var str_options = "";
		var options = 'option' in params ? params['option'] : null;
		var global = false;
		if (options != null && options.length > 0)
		{
			for (var loop = 0; loop < options.length; loop++)
			{
				var option = options[loop];

				if (option == "global")
				{
					global = true;
					str_options += "g";
				}
				else if (option == "multiline")
				{
					str_options += "m";
				}
				else if (option == "ignorecase")
				{
					str_options += "i";
				}
				else if (option == "dotall")
				{
					str_options += 's';
				}
				else if (option == "comment")
				{
					str_options += 'x';
				}
				else if (option == "explicitcapture")
				{
					str_options += 'n';
				}
				else if (option == "astral")
				{
					str_options += 'A';
				}
				else
				{
					retVal["warning"] = ('warning' in retVal ? retVal['warning'] : '') + "Invalid option '" + option + "'";
				}
			}
		}

		html = []
		html.push('<table class="table table-bordered table-striped" style=\"width:auto;">\n');

		html.push("\t<tr>\n");
		html.push("\t\t<td>Regular Expression</td>\n");
		html.push("\t\t<td>");
		html.push(h(str_regex));
		html.push("</td>\n");
		html.push("\t</tr>\n");

		html.push("\t<tr>\n");
		html.push("\t\t<td>Replacement</td>\n");
		html.push("\t\t<td>");
		html.push(h(replacement));
		html.push("</td>\n");

		html.push("\t<tr>\n");
		html.push("\t\t<td>Options</td>\n");
		html.push("\t\t<td>");
		html.push(h(str_options));
		html.push("</td>\n");
		html.push("\t</tr>\n");

		var compileTest = null;

		try
		{
			compileTest = XRegExp(str_regex, str_options);
		}
		catch (err)
		{
			html.push('\t<tr>\n');
			html.push('\t\t<td>Error:</td>\n');
			html.push('\t\t<td>');
			html.push(h(err.message));
			html.push('</td>\n');
			html.push('\t</tr>\n');
			html.push('</table>\n');
			response.write(JSON.stringify({"success": false, "message": "Unable to create XRegExp object: " + err.message, "html": html.join("")}));
			response.end();
			return;
		}
		html.push("</table>\n");

		html.push('<table class=\"table table-bordered table-striped\">\n');

		html.push("\t<thead>");
		html.push("\t\t<tr>\n");
		html.push("\t\t\t<th style=\"text-align:center;\">Test</th>\n");
		html.push("\t\t\t<th>Input</th>");
		html.push("\t\t\t<th>XRegExp.replace()</th>");
		html.push("\t\t\t<th>XRegExp.split()[]</th>");
		html.push("\t\t\t<th>XRegExp.test()</th>");
		html.push("\t\t\t<th>XRegExp.exec().index</th>");
		html.push("\t\t\t<th>XRegExp.exec()[]</th>");
		html.push("\t\t\t<th>regex.lastIndex</th>");
		html.push("\t\t</tr>\n");
		html.push("\t</thead>\n");
		html.push("\t<tbody>\n");


		var inputs = 'input' in params ? params['input'] : null;
		var count = 0;

		if (inputs != null)
		{
			for (var loop = 0; loop < inputs.length; loop++)
			{
				var input = inputs[loop];

				if (input.length == 0)
				{
					continue;
				}
				html.push("\t\t<tr>\n");

				html.push('\t\t\t<td style="text-align:center;">');
				html.push(loop+1);
				html.push("</td>\n");

				html.push('\t\t\t<td>');
				html.push(h(input));
				html.push("</td>\n");

				html.push('\t\t\t<td>');
				html.push(h(XRegExp.replace(input, XRegExp(str_regex, str_options), replacement == null ? "" : replacement)));
				html.push("</td>\n");

				html.push('\t\t\t<td>');
				var splits = XRegExp.split(input, XRegExp(str_regex, str_options));
				for (var split = 0; split < splits.length; split++)
				{
					html.push("[");
					html.push(split);
					html.push("]: ");
					html.push(splits[split] == null ? "<i>(null)</i>" : h(splits[split]));
					html.push("<br/>");
				}
				html.push("</td>\n");

				html.push('\t\t\t<td>');
				html.push(XRegExp.test(input, XRegExp(str_regex, str_options)) ? "true" : "false");
				html.push("</td>\n");

				var regex = XRegExp(str_regex, str_options);
				var result = XRegExp.exec(input, regex);
				if (result == null)
				{
					html.push('\t\t\t<td colspan="6"><i>(null)</i></td>\n');
				}
				else
				{
					var first = true;

					while (result != null)
					{
						if (first == true)
						{
							first = false;
						}
						else
						{
							html.push("</tr>\n");
							html.push('\t\t\t<td colspan="5" style="text-align:right;">');
							html.push("XRegExp.exec()");
							html.push("</td>\n");
						}

						html.push('\t\t\t<td>');
						html.push(result.index);
						html.push("</td>\n");

						html.push('\t\t\t<td>');
						for (var capture = 0; capture < result.length; capture++)
						{
							html.push("[");
							html.push(capture);
							html.push("]: ");
							html.push(result[capture] == null ? "<i>(null)</i>" : h(result[capture]));
							html.push("<br/>");
						}
						if (result.groups) {
							var captureNames = Object.keys(result.groups);
							for (var namedCapture = 0; namedCapture < captureNames.length; namedCapture++)
							{
								var key = captureNames[namedCapture];
								html.push("groups.");
								html.push(key);
								html.push(": ");
								html.push(result.groups[key] == null ? "<i>(null)</i>" : h(result.groups[key]));
								html.push("<br/>");
							}
						}
						html.push("</td>\n");

						html.push('\t\t\t<td>');
						html.push(regex.lastIndex);
						html.push("</td>\n");

						// Avoid an infinite loop for zero-length matches
						var pos = result.index + (result[0].length || 1);

						result = global ? XRegExp.exec(input, regex, pos) : null;
					}

				}
				html.push("\t\t</tr>\n");
				count++;
			}
		}

		if (count == 0)
		{
			html.push("\t\t<tr>\n");
			html.push('\t\t<td colspan="8"><i>');
			html.push("(no input to test)");
			html.push("</i></td>\n");
			html.push("\t\t</tr>\n");
		}

		html.push("\t</tbody>\n");
		html.push("</table>\n");


		retVal["html"] = html.join("");
	}
	catch (err)
	{
		retVal["success"] = false;
		retVal["message"] = err.message;
		retVal["partial_html"] = html.join("");
	}

	response.write(JSON.stringify(retVal));
	response.end();
}

var port = Number(process.env.PORT || process.env.VCAP_APP_PORT || 8888);

http.createServer(function (request, response)
	{
		var parsedUrl = url.parse(request.url);

		if (parsedUrl.pathname == '/test.json')
		{
			if (request.method == 'POST')
			{
				serveTestPost(request, response);
			}
			else
			{
				serveTest(parsedUrl.query, response);
			}
		}
		else if (parsedUrl.pathname == '/status.json')
		{
			serveStatus(parsedUrl.query, response);
		}
		else if (parsedUrl.pathname == '/robots.txt')
		{
			serveFile(response, {"Content-Type": "text/plain"}, "robots.txt");
		}
		else if (parsedUrl.pathname == '/favicon.ico')
		{
			serveFile(response, {"Content-Type": "image/x-icon"}, "favicon.ico");
		}
        else if (parsedUrl.pathname == '/favicon.svg')
        {
            serveFile(response, {"Content-Type": "image/svg+xml"}, "favicon.svg");
        }
		else if (parsedUrl.pathname == '/' || parsedUrl.pathname.lastIndexOf('/index.', 0) === 0 || parsedUrl.pathname.lastIndexOf('/default.', 0) === 0)
		{
			redirect(response, "http://www.regexplanet.com/advanced/xregexp/index.html");
		}
		else
		{
			response.writeHead(404, {"Content-Type": "text/plain"});
			response.write("File not found");
			response.end();
		}

	}).listen(port);

console.log("Server running on port " + port);
