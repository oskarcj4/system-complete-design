import pandas as pd

from reco.matriz import construir


def test_csr_del_ejemplo():
    train = pd.DataFrame({
        "userId":  [10, 10, 10, 20, 30, 30, 30],
        "movieId": [1, 5, 7, 2, 1, 5, 7],
        "rating":  [5.0, 3.0, 4.0, 4.5, 2.0, 4.0, 5.0],
    })
    m, usuarios, items = construir(train, umbral=4.0)
    assert usuarios.tolist() == [10, 20, 30]
    assert items.tolist() == [1, 2, 5, 7]
    assert m.indptr.tolist() == [0, 2, 3, 5]
    assert m.indices.tolist() == [0, 3, 1, 2, 3]
    assert m.data.tolist() == [1.0] * 5
    assert m.toarray().tolist()[2] == [0, 0, 1, 1]