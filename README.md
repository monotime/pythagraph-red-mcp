# Pythagraph RED MCP Server

Node.js server implementing Model Context Protocol (MCP) for Pythagraph RED API access.

## Features

- Fetch graph data from Pythagraph RED API
- Detailed graph analysis with nodes, edges, and statistics
- Formatted table outputs for easy visualization
- Comprehensive graph summaries
- Error handling and timeout management

## API Integration

This server connects to the Pythagraph RED API at:
```
https://red.pythagraph.co.kr/api/red/graph/exportGraphInfo.do?graphId={graphId}
```

## Tools

### `get_graph_data`
Retrieve detailed graph data from Pythagraph RED API. Returns comprehensive information including nodes, edges, statistics, and metadata formatted as tables and descriptions.

**Input:**
- `graphId` (string): The unique identifier for the graph to retrieve

**Output:**
- Detailed tables showing graph statistics
- Node type distributions
- Edge type distributions
- First 10 nodes with their properties
- First 10 edges with their relationships
- Metadata information

**Example:**
```
# MBTI(성질좋은 역순서,점유비율)

## 📊 기본 정보
| 항목 | 값 |
|------|-----|
| Graph ID | G81a6c348-4696-4f04-a164-6e306388ab92 |
| 단위 구분 | 비율 |
| 단위명 | 퍼센트(％) |
| 데이터 건수 | 16건 |

## 📈 데이터 테이블
| 시간 | MBTI유형 | 값 |
|------|----------|-----|
| 15 | ENFP | 12.6% |
| 08 | INFP | 13.4% |
| 04 | INFJ | 6.3% |
```

### `get_graph_summary`
Get a concise summary of graph data from Pythagraph RED API. Provides overview statistics, node/edge type distributions, and key insights.

**Input:**
- `graphId` (string): The unique identifier for the graph to get summary
- `includeDetails` (boolean, optional): Include detailed node and edge information (default: false)

**Output:**
- Quick overview with node and edge counts
- Node and edge type listings
- Graph density calculation
- Optional detailed tables when `includeDetails` is true

**Example:**
```
# MBTI(성질좋은 역순서,점유비율) - 요약

📊 Graph ID: G81a6c348-4696-4f04-a164-6e306388ab92
📊 데이터 건수: 16건
📊 단위: 비율 (퍼센트(％))
📅 등록일: 2023-05-22 15:01

## 🔍 핵심 인사이트
🏆 최고: INFP (13.4%)
📉 최저: ENTJ (2.7%)
📊 총합: 100.0%
```

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

### NPX
```json
{
  "mcpServers": {
    "pythagraph-red": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-pythagraph-red"
      ]
    }
  }
}
```

### Docker
```json
{
  "mcpServers": {
    "pythagraph-red": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "mcp/pythagraph-red"
      ]
    }
  }
}
```

## Development

### Building
```bash
npm install
npm run build
```

### Testing
```bash
npm test
```

### Docker Build
```bash
docker build -t mcp/pythagraph-red .
```

## API Response Format

The server expects the Pythagraph RED API to return JSON data in this format:

```json
{
  "graphId": "G81a6c348-4696-4f04-a164-6e306388ab92",
  "graphNm": "MBTI(성질좋은 역순서,점유비율)",
  "graphDet": "<p>MBTI 성격별 인구비율 및 성격더러운 순서</p>",
  "unitDivNm": "비율",
  "unitNm": "퍼센트(％)",
  "link": "https://ddnews.co.kr/mbti-순위/",
  "dataSrc": "https://ddnews.co.kr/mbti-순위/",
  "dataOrg": "https://ddnews.co.kr/mbti-순위/",
  "regUser": "kimhoon1112@gmail.com",
  "regTime": "2023-05-22 15:01",
  "cols": ["시간", "MBTI유형", "값"],
  "cols2": ["T5", "M1", "VALUE"],
  "graphData": [
    ["15", "ENFP", "0.126"],
    ["08", "INFP", "0.134"],
    ["04", "INFJ", "0.063"]
  ],
  "regionList": [],
  "message": "OK"
}
```

## Error Handling

The server includes comprehensive error handling for:
- Invalid graph IDs
- Network timeouts (30 second limit)
- API response errors
- Invalid JSON responses
- Connection failures

## Features

- **Automatic Table Formatting**: Converts graph data into readable tables
- **Statistics Calculation**: Computes graph density and type distributions
- **Memory Efficient**: Only displays first 10 nodes/edges in detailed view
- **Flexible Output**: Summary mode for quick insights, detailed mode for analysis
- **Robust Error Handling**: Graceful handling of API failures

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License.