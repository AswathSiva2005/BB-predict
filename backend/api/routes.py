from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from backend.api.dependencies import get_current_user, get_db
from backend.api.schemas import (
    DashboardResponse,
    ExplainRequest,
    ExplainResponse,
    HistoryResponse,
    PredictRequest,
    PredictionResponse,
    StocksResponse,
    TrainRequest,
    TrainResponse,
)
from backend.auth.schemas import MessageResponse, PasswordChange, TokenResponse, UserCreate, UserLogin, UserRead, UserUpdate
from backend.services.auth_service import (
    authenticate_user,
    build_token_response,
    change_user_password,
    create_user,
    delete_user_account,
    update_user_profile,
)
from backend.services.dashboard_service import build_dashboard
from backend.services.explanation_service import generate_lime_explanation, generate_shap_explanation
from backend.services.history_service import get_history
from backend.services.prediction_service import predict
from backend.services.stock_service import get_research_overview, get_stocks_overview
from backend.services.training_service import train

router = APIRouter(prefix='/api', tags=['api'])


@router.get('/health')
def health_check() -> dict[str, str]:
    return {'status': 'ok', 'service': 'XAI-Stock API'}


@router.post('/auth/register', response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Database = Depends(get_db)) -> UserRead:
    existing_user = db.users.find_one({'email': payload.email.lower()})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered')
    user = create_user(db, payload)
    return UserRead.model_validate(user)


@router.post('/auth/login', response_model=TokenResponse)
def login(payload: UserLogin, db: Database = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
    return build_token_response(user)


@router.get('/auth/me', response_model=UserRead)
def read_current_user(current_user: dict = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.put('/auth/me', response_model=UserRead)
def edit_current_user(
    payload: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> UserRead:
    try:
        updated_user = update_user_profile(db, current_user, payload)
        return UserRead.model_validate(updated_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put('/auth/password', response_model=MessageResponse)
def update_password(
    payload: PasswordChange,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> MessageResponse:
    try:
        change_user_password(db, current_user, payload)
        return MessageResponse(detail='Password updated successfully')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete('/auth/me', response_model=MessageResponse)
def remove_account(current_user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> MessageResponse:
    delete_user_account(db, current_user)
    return MessageResponse(detail='Account deleted successfully')


@router.get('/research/overview')
def research_overview(current_user: dict = Depends(get_current_user)) -> dict:
    return get_research_overview()


@router.get('/shap')
def shap_explanation(
    symbol: str | None = None,
    sample_index: int = -1,
    sample_size: int = 200,
    max_display: int = 15,
) -> dict:
    try:
        return generate_shap_explanation(
            symbol=symbol,
            sample_index=sample_index,
            sample_size=sample_size,
            max_display=max_display,
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get('/lime')
def lime_explanation(
    symbol: str | None = None,
    sample_index: int = -1,
    num_features: int = 10,
) -> dict:
    try:
        return generate_lime_explanation(
            symbol=symbol,
            sample_index=sample_index,
            num_features=num_features,
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get('/dashboard', response_model=DashboardResponse)
def dashboard(current_user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> DashboardResponse:
    return DashboardResponse.model_validate(build_dashboard(db, current_user))


@router.get('/stocks', response_model=StocksResponse)
def stocks(current_user: dict = Depends(get_current_user)) -> StocksResponse:
    return StocksResponse.model_validate(get_stocks_overview())


@router.get('/prediction', response_model=PredictionResponse)
def prediction(
    current_user: dict = Depends(get_current_user),
    symbol: str | None = None,
    sample_index: int = -1,
) -> PredictionResponse:
    return PredictionResponse.model_validate(predict(request=PredictRequest(symbol=symbol, sample_index=sample_index)))


@router.post('/predict', response_model=PredictionResponse)
def predict_stock(
    payload: PredictRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> PredictionResponse:
    return PredictionResponse.model_validate(predict(db=db, user=current_user, request=payload, persist=True))


@router.post('/train', response_model=TrainResponse)
def train_models(
    payload: TrainRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> TrainResponse:
    return TrainResponse.model_validate(train(db=db, user=current_user, request=payload))


@router.get('/history', response_model=HistoryResponse)
def history(current_user: dict = Depends(get_current_user), db: Database = Depends(get_db)) -> HistoryResponse:
    return HistoryResponse.model_validate(get_history(db, current_user))


@router.post('/explain', response_model=ExplainResponse)
def explain(
    payload: ExplainRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> ExplainResponse:
    if payload.explanation_type == 'shap':
        shap_payload = generate_shap_explanation(
            symbol=payload.symbol,
            sample_index=payload.sample_index,
            sample_size=payload.sample_size,
            max_display=payload.max_display,
        )
        prediction_payload = predict(
            db=db,
            user=current_user,
            request=PredictRequest(symbol=payload.symbol, sample_index=payload.sample_index),
            persist=True,
            explanation_type='shap',
            explanation_payload=shap_payload,
        )
        return ExplainResponse.model_validate({'explanation_type': 'shap', 'shap': shap_payload, 'history_id': prediction_payload['history_id']})

    if payload.explanation_type == 'lime':
        lime_payload = generate_lime_explanation(
            symbol=payload.symbol,
            sample_index=payload.sample_index,
            num_features=payload.num_features,
        )
        prediction_payload = predict(
            db=db,
            user=current_user,
            request=PredictRequest(symbol=payload.symbol, sample_index=payload.sample_index),
            persist=True,
            explanation_type='lime',
            explanation_payload=lime_payload,
        )
        return ExplainResponse.model_validate({'explanation_type': 'lime', 'lime': lime_payload, 'history_id': prediction_payload['history_id']})

    shap_payload = generate_shap_explanation(
        symbol=payload.symbol,
        sample_index=payload.sample_index,
        sample_size=payload.sample_size,
        max_display=payload.max_display,
    )
    lime_payload = generate_lime_explanation(
        symbol=payload.symbol,
        sample_index=payload.sample_index,
        num_features=payload.num_features,
    )
    prediction_payload = predict(
        db=db,
        user=current_user,
        request=PredictRequest(symbol=payload.symbol, sample_index=payload.sample_index),
        persist=True,
        explanation_type='both',
        explanation_payload={'shap': shap_payload, 'lime': lime_payload},
    )
    return ExplainResponse.model_validate({'explanation_type': 'both', 'shap': shap_payload, 'lime': lime_payload, 'history_id': prediction_payload['history_id']})
