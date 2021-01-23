const mineflayer = require('mineflayer')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalNear, GoalFollow } = require('mineflayer-pathfinder').goals
const autoeat = require('mineflayer-auto-eat')
const pvp = require('mineflayer-pvp').plugin
const mineflayerViewer = require('prismarine-viewer').mineflayer
var blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer)
const armorManager = require('mineflayer-armor-manager')
const inventoryViewer = require('mineflayer-web-inventory')

const bot = mineflayer.createBot({
  host: '192.168.2.2', // optional
  port: 4200, // optional
  username: '', // email and password are required only for
  password: '', // online-mode=true servers
  version: '1.16.4', // false corresponds to auto version detection (that's the default), put for example '1.8.8' if you need a specific version
  auth: 'mojang' // optional; by default uses mojang, if using a microsoft account, set to 'microsoft'
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(pvp)
bot.loadPlugin(autoeat)
bot.loadPlugin(blockFinderPlugin)
bot.loadPlugin(armorManager)

// arrays
const authUsers = ['Zandaisamazing', '']

bot.on('chat', function (username, message) {
  if (username === bot.username) return
  console.log(username + ' ' + message)
  if (arrayContains(username, authUsers) && message.includes('pog')) {
    message = message.replace('pog ', '')
    var command = message.split(' ')[0]
    var arg = message.split(' ')[1]
    console.log('Running command: ' + message.split(' ')[0])
    switch (command) {
      case 'sleep':
        goToSleep()
        break
      case 'wakeup':
        wakeUp()
        break
      case 'come': {
        const target = bot.players[username] ? bot.players[username].entity : null
        if (!target) {
          bot.chat('I don\'t see you !')
        } else {
          goToPlayer(target)
        }
        break
      }
      case 'follow': {
        const target = bot.players[username] ? bot.players[username].entity : null
        if (!target) {
          bot.chat('I don\'t see you !')
        } else {
          followPlayer(target)
        }
        break
      }
      case 'stop':
        bot.clearControlStates()
        bot.pvp.stop()
        bot.pathfinder.setGoal(null)
        break
      case 'jump':
        bot.setControlState('jump', true)
        bot.setControlState('jump', false)
        break
      case 'jump a lot':
        bot.setControlState('jump', true)
        break
      case 'stop jumping':
        bot.setControlState('jump', false)
        break
      case 'attack': {
        const target = bot.players[username]
        fightPlayer(target.entity)
        break
      }
      case 'auth':
        authUsers.push(arg)
        bot.chat('User: ' + arg + ' is now authorized')
        break
      case 'deauth': {
        const index = authUsers.indexOf(arg)
        console.log('Deauthed: ' + index)
        if (index > -1) {
          authUsers.splice(index, 1)
        }
        bot.chat('User: ' + arg + ' is now deauthorized')
        break
      }
      // ===RETREVE===
      case 'get':
        getBlock(arg)
        break
      // ===ITEMS===
      case 'items':
        sayItems()
        break
      case 'toss':
        tossItem(itemArgs(arg))
        break
      case 'hold':
        bot.equip(itemByName(arg), 'hand')
        break
      case 'unequip':
        unequipItem(arg[1])
        break
      case 'use':
        useEquippedItem()
        break
      case 'shield':
        bot.equip(itemByName('shield'), 'off-hand')
        break
      // ===CNF===
      default:
        if (arrayContains(username, authUsers)) {
          bot.chat('Command: ' + message + ' not found')
          console.log(message.split('-')[0] + '::::' + message.split(' ')[1])
          break
        }
    }
  } else if (message.includes('pog')) {
    bot.chat(username + ' is not authorized for that command')
  }
})
// =================== Retreve Stuff =======================

async function getBlock (block) {
  bot.chat('Getting ' + block)
  switch (block) {
    case 'wood': {
      console.log('Finding wood')
      const logs = await bot.findBlock({
        point: bot.entity.position,
        matching: '17:1',
        maxDistance: 256,
        count: 1
      })
      console.log(logs)
      const mcData = require('minecraft-data')(bot.version)
      const defaultMove = new Movements(bot, mcData)

      const p = logs.position
      console.log('moving')
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1))
      bot.dig(logs)
      break
    }
    default:
      bot.chat('I cannot get block ' + block)
  }
}

// =================== Combat stufff =======================

async function fightPlayer (entity) {
  bot.pvp.attack(entity)
}

bot.on('startedAttacking', () => {
  try {
    bot.equip(itemByName('shield'), 'off-hand')
  } catch {
    bot.chat('I have no shield')
  }
})

bot.on('attackedTarget', () => {
  sleep(600)
  bot.setControlState('jump', true)
  bot.setControlState('jump', false)
})

// =================== Inventory Stuff=====================

async function sayItems (items = bot.inventory.items()) {
  const output = items.map(itemToString).join(', ')
  if (output) {
    bot.chat(output)
  } else {
    bot.chat('empty')
  }
}
function tossItem (name, amount) {
  amount = parseInt(amount, 10)
  const item = itemByName(name)
  if (!item) {
    bot.chat(`I have no ${name}`)
  } else if (amount) {
    bot.toss(item.type, null, amount, checkIfTossed)
  } else {
    bot.tossStack(item, checkIfTossed)
  }

  function checkIfTossed (err) {
    if (err) {
      bot.chat(`unable to toss: ${err.message}`)
    } else if (amount) {
      bot.chat(`tossed ${amount} x ${name}`)
    } else {
      bot.chat(`tossed ${name}`)
    }
  }
}

async function unequipItem (destination) {
  try {
    await bot.unequip(destination)
    bot.chat('unequipped')
  } catch (err) {
    bot.chat(`cannot unequip: ${err.message}`)
  }
}

function useEquippedItem () {
  bot.chat('activating item')
  bot.activateItem()
}

async function craftItem (name, amount) {
  amount = parseInt(amount, 10)
  const item = require('minecraft-data')(bot.version).findItemOrBlockByName(name)
  const craftingTable = bot.findBlock({
    matching: 58
  })

  if (item) {
    const recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
    if (recipe) {
      bot.chat(`I can make ${name}`)
      try {
        await bot.craft(recipe, amount, craftingTable)
        bot.chat(`did the recipe for ${name} ${amount} times`)
      } catch (err) {
        bot.chat(`error making ${name}`)
      }
    } else {
      bot.chat(`I cannot make ${name}`)
    }
  } else {
    bot.chat(`unknown item: ${name}`)
  }
}

async function goToSleep () {
  const bed = bot.findBlock({
    matching: block => bot.isABed(block)
  })
  if (bed) {
    try {
      await bot.sleep(bed)
      bot.chat('I\'m sleeping')
    } catch (err) {
      bot.chat(`I can't sleep: ${err.message}`)
    }
  } else {
    bot.chat('No nearby bed')
  }
}

async function goToPlayer (target) {
  // Once we've spawn, it is safe to access mcData because we know the version
  const mcData = require('minecraft-data')(bot.version)

  // We create different movement generators for different type of activity
  const defaultMove = new Movements(bot, mcData)

  const p = target.position

  bot.pathfinder.setMovements(defaultMove)
  bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1))
}

async function followPlayer (target) {
  // Once we've spawn, it is safe to access mcData because we know the version
  const mcData = require('minecraft-data')(bot.version)

  // We create different movement generators for different type of activity
  const defaultMove = new Movements(bot, mcData)

  bot.pathfinder.setMovements(defaultMove)
  bot.pathfinder.setGoal(new GoalFollow(target, 3), true)
}

async function wakeUp () {
  try {
    await bot.wake()
  } catch (err) {
    bot.chat(`I can't wake up: ${err.message}`)
  }
}

// =================== Utils ===================

// ===ITEMS===
function itemByName (name) {
  return bot.inventory.items().filter(item => item.name === name)[0]
}

function itemToString (item) {
  if (item) {
    return `${item.name} x ${item.count}`
  } else {
    return '(nothing)'
  }
}

function itemArgs (args) {
  if (args.length === 3) {
    return args[1] + args[2]
  } else if (args.length === 2) {
    return args[1]
  } else {
    return args
  }
}
// === MIS ===

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function arrayContains (needle, arrhaystack) {
  return (arrhaystack.indexOf(needle) > -1)
}

bot.once('spawn', () => {
  mineflayerViewer(bot, { port: 3007, firstPerson: true })
  inventoryViewer(bot)
  bot.autoEat.options = {
    priority: 'foodPoints',
    startAt: 14,
    bannedFood: []
  }

  // getBlock('wood')
})

// ================= bot on ===========================

bot.on('sleep', () => {
  bot.chat('Good night!')
})

bot.on('wake', () => {
  bot.chat('Good morning!')
})

bot.on('death', () => {
  bot.chat('Fecking fecker')
})
// The bot eats food automatically and emits these events when it starts eating and stops eating.

bot.on('autoeat_started', () => {
  console.log('Auto Eat started!')
})

bot.on('autoeat_stopped', () => {
  console.log('Auto Eat stopped!')
})

bot.on('health', () => {
  if (bot.food === 20) bot.autoEat.disable()
  // Disable the plugin if the bot is at 20 food points
  else bot.autoEat.enable() // Else enable the plugin again
})

// Log errors and kick reasons:
bot.on('kicked', (reason, loggedIn) => console.log(reason, loggedIn))
bot.on('error', err => console.log(err))
