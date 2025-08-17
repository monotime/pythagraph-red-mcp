#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import fetch from "node-fetch";

// Schema definitions
const GetGraphDataArgsSchema = z.object({
  graphId: z.string().describe('The unique identifier for the graph to retrieve'),
});

const GetGraphSummaryArgsSchema = z.object({
  graphId: z.string().describe('The unique identifier for the graph to get summary'),
  includeDetails: z.boolean().default(false).describe('Include detailed node and edge information'),
});

type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>;

// API configuration
const API_BASE_URL = "https://red.pythagraph.co.kr/api/red/graph/exportGraphInfo.do";

// Interfaces for API response
interface PythagraphResponse {
  graphId: string;
  graphNm: string;
  graphDet: string;
  unitDivNm: string;
  unitNm: string;
  link: string;
  dataSrc: string;
  dataOrg: string;
  regUser: string;
  regTime: string;
  cols: string[];
  cols2: string[];
  graphData: string[][];
  regionList: any[];
  message: string;
}

// Server setup
const server = new Server(
  {
    name: "pythagraph-red-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// API functions
async function fetchGraphData(graphId: string): Promise<PythagraphResponse> {
  const url = `${API_BASE_URL}?graphId=${encodeURIComponent(graphId)}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MCP-PythagraphRED-Server/0.1.0',
      },
//      timeout: 30000, // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as PythagraphResponse;
    
    if (data.message !== 'OK') {
      throw new Error(`API Error: ${data.message}`);
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch graph data: ${error.message}`);
    }
    throw new Error('Failed to fetch graph data: Unknown error');
  }
}

// Data formatting functions
function formatGraphDataAsTable(data: PythagraphResponse): string {
  let result = "";

  // Graph Overview
  result += `# ${data.graphNm}\n\n`;
  
  // Graph Details (HTML을 텍스트로 변환)
  if (data.graphDet) {
    const cleanDescription = data.graphDet
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&quot;/g, '"') // HTML 엔티티 변환
      .replace(/﻿/g, '') // 특수 문자 제거
      .trim();
    result += `**설명**: ${cleanDescription}\n\n`;
  }

  // Basic Information
  result += "## 📊 기본 정보\n\n";
  result += "| 항목 | 값 |\n";
  result += "|------|----|\n";
  result += `| Graph ID | ${data.graphId} |\n`;
  result += `| 단위 구분 | ${data.unitDivNm} |\n`;
  result += `| 단위명 | ${data.unitNm} |\n`;
  result += `| 등록자 | ${data.regUser} |\n`;
  result += `| 등록시간 | ${data.regTime} |\n`;
  result += `| 데이터 건수 | ${data.graphData.length}건 |\n`;

  // Data Sources
  if (data.dataSrc || data.dataOrg || data.link) {
    result += "\n## 🔗 데이터 출처\n\n";
    result += "| 구분 | URL |\n";
    result += "|------|-----|\n";
    if (data.dataSrc) result += `| 데이터 소스 | ${data.dataSrc} |\n`;
    if (data.dataOrg) result += `| 데이터 기관 | ${data.dataOrg} |\n`;
    if (data.link) result += `| 링크 | ${data.link} |\n`;
  }

  // Main Data Table
  if (data.graphData && data.graphData.length > 0 && data.cols) {
    result += "\n## 📈 데이터 테이블\n\n";
    
    // 테이블 헤더 생성
    const headers = data.cols.join(" | ");
    const separator = data.cols.map(() => "------").join(" | ");
    
    result += `| ${headers} |\n`;
    result += `| ${separator} |\n`;
    
    // 데이터 행 생성
    for (const row of data.graphData) {
      if (row.length === data.cols.length) {
        const formattedRow = row.map((cell, index) => {
          // 값 컬럼인 경우 숫자로 포맷팅
          if (data.cols[index].includes('값') && !isNaN(parseFloat(cell))) {
            const numValue = parseFloat(cell);
            return (numValue * 100).toFixed(1) + '%'; // 비율을 퍼센트로 변환
          }
          return cell;
        }).join(" | ");
        result += `| ${formattedRow} |\n`;
      }
    }
  }

  // Statistics
  if (data.graphData && data.graphData.length > 0) {
    result += "\n## 📊 통계 분석\n\n";
    
    // 값 컬럼 찾기
    const valueColumnIndex = data.cols.findIndex(col => col.includes('값'));
    
    if (valueColumnIndex !== -1) {
      const values = data.graphData
        .map(row => parseFloat(row[valueColumnIndex]))
        .filter(val => !isNaN(val));
      
      if (values.length > 0) {
        const total = values.reduce((sum, val) => sum + val, 0);
        const average = total / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        result += "| 통계 항목 | 값 |\n";
        result += "|-----------|----|\n";
        result += `| 총합 | ${(total * 100).toFixed(1)}% |\n`;
        result += `| 평균 | ${(average * 100).toFixed(1)}% |\n`;
        result += `| 최댓값 | ${(max * 100).toFixed(1)}% |\n`;
        result += `| 최솟값 | ${(min * 100).toFixed(1)}% |\n`;
        result += `| 데이터 개수 | ${values.length}개 |\n`;
      }
    }
  }

  return result;
}

function formatGraphSummary(data: PythagraphResponse, includeDetails: boolean = false): string {
  let result = "";

  result += `# ${data.graphNm} - 요약\n\n`;

  // 기본 정보
  result += `📊 **Graph ID**: ${data.graphId}\n`;
  result += `📊 **데이터 건수**: ${data.graphData.length}건\n`;
  result += `📊 **단위**: ${data.unitDivNm} (${data.unitNm})\n`;
  result += `📅 **등록일**: ${data.regTime}\n\n`;

  // 설명
  if (data.graphDet) {
    const cleanDescription = data.graphDet
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/﻿/g, '')
      .trim();
    result += `**설명**: ${cleanDescription}\n\n`;
  }

  // 빠른 통계
  if (data.graphData && data.graphData.length > 0) {
    const valueColumnIndex = data.cols.findIndex(col => col.includes('값'));
    
    if (valueColumnIndex !== -1) {
      const values = data.graphData
        .map(row => parseFloat(row[valueColumnIndex]))
        .filter(val => !isNaN(val));
      
      if (values.length > 0) {
        const total = values.reduce((sum, val) => sum + val, 0);
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        // 최고값과 최저값 항목 찾기
        const maxIndex = data.graphData.findIndex(row => parseFloat(row[valueColumnIndex]) === max);
        const minIndex = data.graphData.findIndex(row => parseFloat(row[valueColumnIndex]) === min);
        
        result += "## 🔍 핵심 인사이트\n\n";
        if (maxIndex !== -1) {
          const categoryIndex = data.cols.findIndex(col => col.includes('MBTI') || col.includes('유형'));
          const maxCategory = categoryIndex !== -1 ? data.graphData[maxIndex][categoryIndex] : data.graphData[maxIndex][1];
          result += `🏆 **최고**: ${maxCategory} (${(max * 100).toFixed(1)}%)\n`;
        }
        if (minIndex !== -1) {
          const categoryIndex = data.cols.findIndex(col => col.includes('MBTI') || col.includes('유형'));
          const minCategory = categoryIndex !== -1 ? data.graphData[minIndex][categoryIndex] : data.graphData[minIndex][1];
          result += `📉 **최저**: ${minCategory} (${(min * 100).toFixed(1)}%)\n`;
        }
        result += `📊 **총합**: ${(total * 100).toFixed(1)}%\n\n`;
      }
    }
  }

  if (includeDetails) {
    result += "\n---\n\n" + formatGraphDataAsTable(data);
  } else {
    result += "\n*`includeDetails: true` 옵션을 사용하면 전체 데이터 테이블을 볼 수 있습니다.*\n";
  }

  return result;
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_graph_data",
        description: "Retrieve detailed graph data from Pythagraph RED API. Returns comprehensive information including nodes, edges, statistics, and metadata formatted as tables and descriptions. Perfect for analyzing graph structure and getting detailed insights.",
        inputSchema: zodToJsonSchema(GetGraphDataArgsSchema) as ToolInput,
      },
      {
        name: "get_graph_summary",
        description: "Get a concise summary of graph data from Pythagraph RED API. Provides overview statistics, node/edge type distributions, and key insights without overwhelming detail. Use includeDetails=true for more comprehensive analysis.",
        inputSchema: zodToJsonSchema(GetGraphSummaryArgsSchema) as ToolInput,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_graph_data": {
        const parsed = GetGraphDataArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_graph_data: ${parsed.error}`);
        }

        const graphData = await fetchGraphData(parsed.data.graphId);
        const formattedData = formatGraphDataAsTable(graphData);

        return {
          content: [{ type: "text", text: formattedData }],
        };
      }

      case "get_graph_summary": {
        const parsed = GetGraphSummaryArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_graph_summary: ${parsed.error}`);
        }

        const graphData = await fetchGraphData(parsed.data.graphId);
        const summary = formatGraphSummary(graphData, parsed.data.includeDetails);

        return {
          content: [{ type: "text", text: summary }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pythagraph RED MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});