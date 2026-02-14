export class ContactIndexDO {

  constructor(state, env) {
    this.state = state
    this.env = env
  }

  async fetch(req) {

    const url = new URL(req.url)

    if (url.pathname === "/add") {
      return this.addContact(req)
    }

    if (url.pathname === "/list") {
      return this.getList()
    }

    if (url.pathname === "/upsert") {
      return this.upsertContact(req)
    }

    return new Response("NOT_FOUND", { status: 404 })
  }

  async addContact(req) {

    const body = await req.json()

    const id = body.customer_id

    if (!id) {
      return Response.json({ ok:false })
    }

    let contacts = await this.state.storage.get("contacts") || {}

    contacts[id] = {
      customer_id: id,
      last_message_ts: Date.now()
    }

    await this.state.storage.put("contacts", contacts)

    return Response.json({ ok:true })
  }

  async getList() {

    const contacts = await this.state.storage.get("contacts") || {}

    return Response.json({
      ok:true,
      chats:Object.values(contacts)
    })
  }

  async upsertContact(req) {

    const contact = await req.json()

    if (!contact.customer_id) {
      return Response.json({ ok: false, error: 'Missing customer_id' })
    }

    // 存储单个联系人
    await this.state.storage.put('contact:' + contact.customer_id, contact)

    // 更新联系人列表
    let contacts = await this.state.storage.get("contacts") || {}
    contacts[contact.customer_id] = {
      customer_id: contact.customer_id,
      last_message_ts: contact.last_ts || Date.now(),
      last_message: contact.last_message || '[media]',
      channel: contact.channel || 'whatsapp'
    }
    await this.state.storage.put("contacts", contacts)

    return Response.json({ ok: true })
  }
}
