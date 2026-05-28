export default function Settings() {
  return (
    <div className="card" style={{ gridColumn: 'span 12', gridRow: 'span 8', zIndex: 1, position: 'relative' }}>
      <div className="card__header">Settings</div>
      <div className="card__body">
        <div className="text-muted" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          Application settings — coming soon
        </div>
      </div>
    </div>
  )
}
