import { memo } from "react";
import { Link2, X } from "lucide-react";

function NoteNode({ data }) {
  const { note, linkedTableName, onUpdateNote, onUnlinkNote, onDeleteNote } = data;

  return (
    <div className="note-node">
      <div className="note-node__header">
        <input
          className="note-node__title nodrag"
          value={note.title}
          onChange={(e) => onUpdateNote(note.id, { title: e.target.value })}
        />
        <button className="note-node__delete nodrag" title="Delete note" onClick={() => onDeleteNote(note.id)}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        className="note-node__content nodrag"
        value={note.content}
        placeholder="Write a note…"
        onChange={(e) => onUpdateNote(note.id, { content: e.target.value })}
      />

      {linkedTableName && (
        <div className="note-node__link nodrag">
          <Link2 className="h-3 w-3" />
          <span className="note-node__link-name" title={linkedTableName}>
            {linkedTableName}
          </span>
          <button className="note-node__unlink" title="Unlink from table" onClick={() => onUnlinkNote(note.id)}>
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(NoteNode);
