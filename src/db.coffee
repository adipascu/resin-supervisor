Knex = require 'knex'
path = require 'path'
constants = require './lib/constants'

module.exports = class DB
	constructor: ({ @databasePath } = {}) ->
		@databasePath ?= constants.databasePath
		@knex = Knex(
			client: 'sqlite3'
			connection:
				filename: @databasePath
			useNullAsDefault: true
		)

	init: =>
		@knex('knex_migrations_lock').update({ is_locked: 0 })
		.catch(->) # Knex doesn't return a bluebird promise here so we can't catchReturn :(
		.then =>
			@knex.migrate.latest(directory: path.join(__dirname, 'migrations'))

	# Returns a knex object for one of the models (tables)
	models: (modelName) =>
		@knex(modelName)

	upsertModel: (modelName, obj, id, trx) =>
		knex = trx ? @knex
		knex(modelName).update(obj).where(id)
		.then (n) ->
			if n == 0
				knex(modelName).insert(obj)

	transaction: (cb) =>
		@knex.transaction(cb)
