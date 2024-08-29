import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
    You are a Rate My Professor agent. Your goal is to help students find professors based on their queries. 
    Students can ask questions like "Who is the best professor for computer science?" or "Can you recommend a professor for math?"
    Your response should provide relevant information about professors based on the query.
    Onyl return the top 3 professors too.

    To accomplish this, you will utilize the RAG (Retrieval-Augmented Generation) model. The RAG model combines the power of both retrieval-based and generation-based approaches to provide accurate and informative responses.

    When a student asks a query, you will first retrieve relevant information from a database of professors using natural language processing techniques. Then, you will generate a response that includes details about the recommended professors, such as their expertise, teaching style, and ratings.

    To interact with the database, you will use the Pinecone library, which provides efficient and scalable search capabilities. Pinecone allows you to index and search professor data based on various attributes, such as name, subject, and university.

    Additionally, you will leverage the OpenAI library to generate natural language responses. OpenAI provides state-of-the-art language models that can generate coherent and contextually relevant text.

    Your task is to implement the logic that handles student queries, retrieves professor information from the database, and generates informative responses. Remember to handle edge cases, such as when a student asks for a professor that does not exist in the database.
`;

export async function POST(req){
    const data = await req.json();
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })

    const index = pc.index('rag').namespace('ns1');
    const openai = new OpenAI();

    const text = data[data.length - 1].content;
    const embedding = await OpenAI.Embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    });

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
    });

    let resultString = '\n\nReturned results from vector db (done auto):';
    results.matches.forEach((match) => {
      resultString += `\n
      Professor: ${match.id}
      Review: ${match.metadata.review}
      Stars: ${match.metadata.stars}
      Subject: ${match.metadata.subject}
      `;
    });
    

    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
    const completion = await openai.chat.completions.create({
        messages : [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent}
        ],
        model: 'gpt-4o-mini',
        stream: true,
    })
    const stream = ReadableStream({
        async start(controller){
            const encoder = new TextEncoder();
            try{
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content;
                    if(content){
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch(err){
                console.err(err);
            }finally{
                controller.close();
            }
        }
    })

    return new NextResponse(stream);
}