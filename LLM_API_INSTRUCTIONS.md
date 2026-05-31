# Knowledge Graph API Instructions for LLMs

This document describes the REST API designed to let an LLM read, explore, and modify this Knowledge Graph application. 

## Base Rules for LLMs
1. **Method**: All endpoints exclusively use the `GET` method.
2. **Base URL**: `http://localhost:3000`
3. **Encoding**: All parameters passed in the URL must be properly URI-encoded (e.g., spaces as `%20`, `#` as `%23`, `&` as `%26`).
4. **Linking**: To link two notes together, add a wiki-style link in the `content` of a note (e.g., `[[Target Note Title]]`). 
5. **Tagging**: To tag a note, simply add a hashtag anywhere in the `content` (e.g., `#machine_learning`). Vhe system will automatically parse and save it as a tag.

---

## 1. Get All Notes (Read Knowledge Graph Nodes)
**Endpoint**: `/api/notes`
**Use Case**: Retrieve the full state of the knowledge graph to understand existing concepts, relationships, and context.
**Parameters**:
- `search` (optional): A string to filter notes by title or content.
**Example**:
`GET http://localhost:3000/api/notes`
`GET http://localhost:3000/api/notes?search=neural%20networks`

---

## 2. Create Note (Add Node to Knowledge Graph)
**Endpoint**: `/api/create-note`
**Use Case**: You discovered a new concept, idea, or entity that deserves its own dedicated node in the graph.
**Parameters**:
- `title` (optional): The name/title of the new note. Defaults to 'Untitled Note'.
- `content` (optional): The body text. Include `#tags` or `[[links]]` here.
- `folder` (optional): The category/namespace. Defaults to 'Inbox'.
- `id` (optional): A custom unique identifier. If omitted, the system generates a timestamp-based ID.
**Example**:
`GET http://localhost:3000/api/create-note?title=LLM%20Agents&content=Agents%20use%20tools%20like%20%23ai&folder=Research`

---

## 3. Edit Note (Update Node / Create Relationships)
**Endpoint**: `/api/edit-note`
**Use Case**: You need to expand on a concept, fix information, or establish a new relationship (edge) by inserting a `[[Link]]` into an existing note's content.
**Parameters**:
- `id` (**required**): The exact ID of the note to modify.
- `title` (optional): The new title.
- `content` (optional): The new content. Replaces the old content entirely.
- `folder` (optional): Move the note to a different folder.
**Example**:
`GET http://localhost:3000/api/edit-note?id=123456789&content=Updated%20definition%20with%20a%20link%20to%20%5B%5BLLM%20Agents%5D%5D`

---

## 4. Delete Note (Remove Node)
**Endpoint**: `/api/delete-note`
**Use Case**: A concept is obsolete, incorrect, or merged into another note.
**Parameters**:
- `id` (**required**): The exact ID of the note to delete.
**Example**:
`GET http://localhost:3000/api/delete-note?id=123456789`

---

## 5. Get Folders (List Namespaces)
**Endpoint**: `/api/folders`
**Use Case**: Discover the high-level organizational structure (categories/namespaces) of the knowledge graph.
**Parameters**: None
**Example**:
`GET http://localhost:3000/api/folders`

---

## 6. Create Folder (Add Namespace)
**Endpoint**: `/api/create-folder`
**Use Case**: You are introducing a brand new high-level category to organize future notes.
**Parameters**:
- `name` (**required**): The name of the new folder.
**Example**:
`GET http://localhost:3000/api/create-folder?name=Artificial%20Intelligence`

---

## 7. Import Data (Bulk Operations)
**Endpoint**: `/api/import`
**Use Case**: You have a large chunk of structured JSON data (multiple nodes and folders) that you want to inject into the graph in a single operation.
**Parameters**:
- `data` (**required**): A URI-encoded JSON string containing `{"notes": [], "folders": []}`.
**Example**:
`GET http://localhost:3000/api/import?data=%7B%22notes%22%3A%5B%5D%2C%22folders%22%3A%5B%22NewFolder%22%5D%7D`
