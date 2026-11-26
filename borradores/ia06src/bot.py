"""El teléfono del consultorio: el navegador habla por WebRTC con una tubería de Pipecat.

Correlo con: uv run bot.py   y abre http://localhost:7860/client
"""
import uuid

from loguru import logger
from pipecat.adapters.llm.schemas.direct_function import tool_options
from pipecat.adapters.llm.schemas.function_schema import FunctionSchema
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import LLMRunFrame
from pipecat.observers.user_bot_latency_observer import UserBotLatencyObserver
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair, LLMUserAggregatorParams)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.transports.base_transport import TransportParams
from pipecat.workers.runner import WorkerRunner

from voz.config import CFG
from voz.herramientas import HERRAMIENTAS, Sesion
from voz.latencia import anotar
from voz.modelos import boca, cerebro, oido
from voz.prompt import instrucciones


def a_pipecat(h: dict, sesion: Sesion) -> FunctionSchema:
    """Envuelve una herramienta de herramientas.py en el formato de Pipecat."""
    async def manejar(params):
        mensajes = params.context.get_messages()
        resultado = await h["fn"](sesion, mensajes, dict(params.arguments))
        logger.info(f"{h['name']}({dict(params.arguments)}) -> {resultado}")
        await params.result_callback(resultado)
    if h["efecto"]:
        manejar = tool_options(cancel_on_interruption=False)(manejar)
    return FunctionSchema(name=h["name"], description=h["description"],
                          properties=h["properties"], required=h["required"], handler=manejar)


async def bot(runner_args: RunnerArguments):
    transport = await create_transport(runner_args, {
        "webrtc": lambda: TransportParams(audio_in_enabled=True, audio_out_enabled=True),
    })
    sesion = Sesion(id=runner_args.session_id or uuid.uuid4().hex)
    context = LLMContext(tools=[a_pipecat(h, sesion) for h in HERRAMIENTAS])
    usuario, agente = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=CFG.silencio))),
    )
    pipeline = Pipeline([
        transport.input(), oido(), usuario, cerebro(instrucciones()), boca(), transport.output(), agente,
    ])

    latencia = UserBotLatencyObserver()

    @latencia.event_handler("on_latency_breakdown")
    async def on_latency_breakdown(observer, desglose):
        anotar(sesion.id, CFG.modelo, desglose)

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        observers=[latencia],
    )

    @worker.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        context.add_message({"role": "developer", "content": "Saluda en una frase y pregunta en qué puedes ayudar."})
        await worker.queue_frames([LLMRunFrame()])

    @agente.event_handler("on_assistant_turn_stopped")
    async def on_assistant_turn_stopped(aggregator, message):
        if message.interrupted:
            logger.info(f"Interrumpido. Llegó a sonar: {message.content!r}")

    runner = WorkerRunner(handle_sigint=runner_args.handle_sigint)

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        await runner.cancel()

    await runner.add_workers(worker)
    await runner.run()


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
