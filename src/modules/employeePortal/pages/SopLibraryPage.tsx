import { sopDocuments } from '../services/trainingService';
export function SopLibraryPage() { return <section><h2>SOP / Document Library</h2><div className="cards">{sopDocuments.map((doc) => <article className="record-card" key={doc.id}><h3>{doc.title}</h3><p>{doc.category} · Version {doc.version}</p><p>Reference: {doc.fileReference}</p></article>)}</div></section>; }
