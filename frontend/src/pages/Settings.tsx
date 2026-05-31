export default function Settings() {
  return (
    <div className="card" style={{ gridColumn: 'span 12', gridRow: 'span 8', zIndex: 1, position: 'relative' }}>
      <div className="card__header">Settings</div>
      <div className="card__body">
        <div className="table__empty">
          <div className="table__empty-icon">S</div>
          <span>Application settings &mdash; coming soon</span>
        </div>
      </div>
    </div>
  )
}
