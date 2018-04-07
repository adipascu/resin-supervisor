Promise = require 'bluebird'
childProcess = Promise.promisifyAll(require('child_process'))

clearIptablesRule = (rule) ->
	childProcess.execAsync("iptables -D #{rule}")

clearAndAppendIptablesRule = (rule) ->
	clearIptablesRule(rule)
	.catchReturn()
	.then ->
		childProcess.execAsync("iptables -A #{rule}")

clearAndInsertIptablesRule = (rule) ->
	clearIptablesRule(rule)
	.catchReturn()
	.then ->
		childProcess.execAsync("iptables -I #{rule}")

exports.rejectOnAllInterfacesExcept = (allowedInterfaces, port) ->
	# We delete each rule and create it again to ensure ordering (all ACCEPTs before the REJECT/DROP).
	# This is especially important after a supervisor update.
	Promise.each allowedInterfaces, (iface) ->
		clearAndInsertIptablesRule("INPUT -p tcp --dport #{port} -i #{iface} -j ACCEPT")
	.then ->
		clearAndAppendIptablesRule("INPUT -p tcp --dport #{port} -j REJECT")
		.catch ->
			# On systems without REJECT support, fall back to DROP
			clearAndAppendIptablesRule("INPUT -p tcp --dport #{port} -j DROP")

exports.removeRejections = (port) ->
	clearIptablesRule("INPUT -p tcp --dport #{port} -j REJECT")
	.catchReturn()
	.then ->
		clearIptablesRule("INPUT -p tcp --dport #{port} -j DROP")
	.catchReturn()
