"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sparkles, Code2, Copy, Check } from "lucide-react"
import type { MCPTool } from "@/lib/types"

interface CodeWizardProps {
  tool: MCPTool | null
  onCodeGenerated: (code: string) => void
}

// Helper function to convert JavaScript value to Python representation
function toPythonLiteral(value: any, indent = 0): string {
  const indentStr = "  ".repeat(indent)
  
  if (value === null || value === undefined) {
    return "None"
  }
  
  if (typeof value === "string") {
    // Escape quotes and wrap in quotes
    const escaped = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"')
    return `"${escaped}"`
  }
  
  if (typeof value === "number") {
    return value.toString()
  }
  
  if (typeof value === "boolean") {
    return value ? "True" : "False"
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    const items = value.map(item => `${indentStr}  ${toPythonLiteral(item, indent + 1)}`).join(",\n")
    return `[\n${items}\n${indentStr}]`
  }
  
  if (typeof value === "object") {
    const keys = Object.keys(value)
    if (keys.length === 0) return "{}"
    const items = keys.map(key => {
      const pyKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : JSON.stringify(key)
      const pyValue = toPythonLiteral(value[key], indent + 1)
      return `${indentStr}  ${pyKey}: ${pyValue}`
    }).join(",\n")
    return `{\n${items}\n${indentStr}}`
  }
  
  return JSON.stringify(value)
}

// Helper function to generate Python code from form data
function generatePythonCode(toolName: string, formData: Record<string, any>): string {
  // Filter out empty values for cleaner code (but keep 0 and false)
  const filteredData: Record<string, any> = {}
  Object.keys(formData).forEach(key => {
    const value = formData[key]
    if (value !== undefined && 
        value !== null && 
        value !== "" && 
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === "object" && Object.keys(value).length === 0)) {
      filteredData[key] = value
    }
  })
  
  const pythonDict = toPythonLiteral(filteredData)
  
  const codeLines = [
    `# Generated code for ${toolName}`,
    "import json",
    "",
    "# Tool input",
    `tool_input = ${pythonDict}`,
    "",
    "# Call the tool",
    `print(f'Executing ${toolName} with input:')`,
    "print(json.dumps(tool_input, indent=2))",
    "",
    "# Make the tool call",
    "try:",
    "    result = mcp.call(",
    `        "${toolName}",`,
    "        tool_input",
    "    )",
    "    print('\\nTool result:')",
    "    print(json.dumps(result, indent=2))",
    "except Exception as e:",
    "    print(f'\\nError calling tool: {e}')",
    "    raise",
  ]

  return codeLines.join("\n")
}

// Render form field based on JSON schema property
function renderFormField(
  key: string,
  schema: any,
  value: any,
  onChange: (value: any) => void,
  required: boolean
) {
  const fieldType = schema.type || "string"
  const description = schema.description || ""
  const label = schema.title || key

  switch (fieldType) {
    case "string":
      if (schema.enum) {
        // Select dropdown for enum
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            <select
              id={key}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select {label}</option>
              {schema.enum.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )
      }
      // Textarea for longer strings, input for short ones
      if (description.length > 50 || key.toLowerCase().includes("content") || key.toLowerCase().includes("text")) {
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            <Textarea
              id={key}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="min-h-[80px]"
            />
          </div>
        )
      }
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <Input
            id={key}
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </div>
      )

    case "number":
    case "integer":
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <Input
            id={key}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(fieldType === "integer" ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </div>
      )

    case "boolean":
      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={key}
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          {description && <p className="text-xs text-muted-foreground ml-6">{description}</p>}
        </div>
      )

    case "array":
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <Textarea
            id={key}
            value={Array.isArray(value) ? value.join("\n") : ""}
            onChange={(e) => onChange(e.target.value.split("\n").filter((v) => v.trim()))}
            placeholder="Enter one item per line"
            className="min-h-[80px]"
          />
        </div>
      )

    case "object":
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <Textarea
            id={key}
            value={typeof value === "string" ? value : JSON.stringify(value || {}, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value))
              } catch {
                onChange(e.target.value)
              }
            }}
            placeholder='Enter JSON object, e.g. {"key": "value"}'
            className="min-h-[100px] font-mono text-xs"
          />
        </div>
      )

    default:
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <Input
            id={key}
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </div>
      )
  }
}

export function CodeWizard({ tool, onCodeGenerated }: CodeWizardProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [copied, setCopied] = useState(false)

  // Reset form data when tool changes
  useEffect(() => {
    setFormData({})
  }, [tool?.id])

  if (!tool || !tool.input_schema) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Code Wizard</p>
          <p className="text-sm text-muted-foreground">Select a tool to use the code wizard</p>
        </div>
      </div>
    )
  }

  const schema = tool.input_schema
  const properties = schema.properties || {}
  const required = schema.required || []

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleGenerateCode = () => {
    const code = generatePythonCode(tool.name, formData)
    onCodeGenerated(code)
  }

  const generatedCode = generatePythonCode(tool.name, formData)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isFormValid = required.every((key: string) => {
    const value = formData[key]
    return value !== undefined && value !== null && value !== ""
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Code Wizard</h3>
          <p className="text-sm text-muted-foreground">Fill out the form below to generate Python code for {tool.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyCode}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied!" : "Copy Code"}
        </Button>
      </div>
      <div className="space-y-4 overflow-y-auto pr-2">
        {Object.keys(properties).map((key) => {
          const fieldSchema = properties[key]
          return renderFormField(
            key,
            fieldSchema,
            formData[key],
            (value) => handleFieldChange(key, value),
            required.includes(key)
          )
        })}
      </div>

      <div className="pt-4 border-t">
        <Button onClick={handleGenerateCode} disabled={!isFormValid} className="w-full">
          <Code2 className="h-4 w-4 mr-2" />
          Generate & Run Code
        </Button>
      </div>
    </div>
  )
}
