export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Test Page</h1>
        <p className="text-lg">Frontend is working on port 3000!</p>
        <p className="text-sm text-gray-600 mt-4">
          Time: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  )
}